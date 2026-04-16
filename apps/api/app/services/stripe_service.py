"""
StripeService: provider subscription management via Stripe.

Responsibilities:
  - create_subscription: initiate a new subscription, return client_secret for Stripe.js
  - get_portal_url: create a Stripe Customer Portal session for self-service billing
  - handle_webhook: verify Stripe signature and dispatch to event handlers
  - Event handlers update Subscription and ProviderProfile rows accordingly
"""
import uuid
from datetime import datetime, timezone

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.provider import ProviderProfile, Subscription, SubscriptionTier
from app.models.user import User


class StripeService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        stripe.api_key = settings.stripe_secret_key

    # ─── Public API ──────────────────────────────────────────────────────────

    async def create_subscription(self, user: User, tier: SubscriptionTier) -> dict:
        """
        Initiate a Stripe subscription for the given tier.
        Returns {"client_secret": "..."} which Stripe.js uses to confirm payment.
        """
        profile = await self._get_profile(user.id)

        if not profile.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider has no Stripe customer — contact support",
            )

        price_id = self._price_id_for_tier(tier)
        if not price_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Stripe price for tier {tier.value} is not configured",
            )

        stripe_sub = stripe.Subscription.create(
            customer=profile.stripe_customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"],
        )

        # Upsert Subscription row with status "incomplete" — activates on invoice.paid webhook
        await self._upsert_subscription(
            profile=profile,
            stripe_sub_id=stripe_sub["id"],
            tier=tier,
            stripe_status="incomplete",
            period_end=datetime.fromtimestamp(
                stripe_sub["current_period_end"], tz=timezone.utc
            ),
        )

        client_secret = (
            stripe_sub["latest_invoice"]["payment_intent"]["client_secret"]
        )
        return {"client_secret": client_secret}

    async def get_portal_url(self, user: User, return_url: str) -> str:
        """Create a Stripe Customer Portal session and return its URL."""
        profile = await self._get_profile(user.id)

        if not profile.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider has no Stripe customer — contact support",
            )

        session = stripe.billing_portal.Session.create(
            customer=profile.stripe_customer_id,
            return_url=return_url,
        )
        return session["url"]

    async def get_subscription(self, user: User) -> Subscription | None:
        """Return the Subscription row for this provider, or None if not subscribed."""
        profile = await self._get_profile(user.id)
        return await self._db.scalar(
            select(Subscription).where(Subscription.provider_id == profile.id)
        )

    async def handle_webhook(self, payload: bytes, sig_header: str) -> None:
        """
        Verify the Stripe-Signature header and dispatch to the appropriate handler.
        Raises HTTPException 400 if signature verification fails.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Stripe webhook signature",
            )

        handlers = {
            "invoice.paid": self._on_invoice_paid,
            "invoice.payment_failed": self._on_payment_failed,
            "customer.subscription.deleted": self._on_subscription_deleted,
        }
        handler = handlers.get(event["type"])
        if handler:
            await handler(event["data"]["object"])

    # ─── Webhook Handlers ────────────────────────────────────────────────────

    async def _on_invoice_paid(self, invoice: dict) -> None:
        """
        Stripe fires this when a subscription payment succeeds (initial or renewal).
        Activate the provider's profile and mark the subscription as active.
        """
        stripe_sub_id: str = invoice["subscription"]
        stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)

        sub = await self._db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub_id
            )
        )
        if not sub:
            return  # subscription row may not exist yet for the very first invoice

        period_end = datetime.fromtimestamp(
            stripe_sub["current_period_end"], tz=timezone.utc
        )
        sub.status = "active"
        sub.current_period_end = period_end

        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.id == sub.provider_id)
        )
        if profile:
            profile.is_active = True
            profile.subscription_tier = sub.tier
            profile.subscription_status = "active"

        await self._db.commit()

        if profile:
            user = await self._db.scalar(
                select(User).where(User.id == profile.user_id)
            )
            if user:
                from app.workers.tasks import send_subscription_renewal_email
                send_subscription_renewal_email.delay(
                    str(user.id),
                    tier=sub.tier.value,
                    period_end_iso=period_end.isoformat(),
                )

    async def _on_payment_failed(self, invoice: dict) -> None:
        """
        Stripe fires this when a subscription payment fails.
        Puts the subscription in 'past_due' grace period — listing stays active temporarily.
        """
        stripe_sub_id: str = invoice["subscription"]

        sub = await self._db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub_id
            )
        )
        if not sub:
            return

        sub.status = "past_due"

        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.id == sub.provider_id)
        )
        if profile:
            profile.subscription_status = "grace_period"

        await self._db.commit()

    async def _on_subscription_deleted(self, sub_obj: dict) -> None:
        """
        Stripe fires this when a subscription is cancelled or expires.
        Deactivate the provider's listing.
        """
        stripe_sub_id: str = sub_obj["id"]

        sub = await self._db.scalar(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub_id
            )
        )
        if not sub:
            return

        sub.status = "cancelled"

        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.id == sub.provider_id)
        )
        if profile:
            profile.is_active = False
            profile.subscription_status = "cancelled"

        await self._db.commit()

    # ─── Private Helpers ─────────────────────────────────────────────────────

    async def _get_profile(self, user_id: uuid.UUID) -> ProviderProfile:
        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.user_id == user_id)
        )
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider profile not found",
            )
        return profile

    def _price_id_for_tier(self, tier: SubscriptionTier) -> str:
        return {
            SubscriptionTier.BASIC: settings.stripe_price_id_basic,
            SubscriptionTier.PRO: settings.stripe_price_id_pro,
            SubscriptionTier.PREMIUM: settings.stripe_price_id_premium,
        }[tier]

    async def _upsert_subscription(
        self,
        profile: ProviderProfile,
        stripe_sub_id: str,
        tier: SubscriptionTier,
        stripe_status: str,
        period_end: datetime,
    ) -> Subscription:
        existing = await self._db.scalar(
            select(Subscription).where(Subscription.provider_id == profile.id)
        )
        if existing:
            existing.stripe_subscription_id = stripe_sub_id
            existing.tier = tier
            existing.status = stripe_status
            existing.current_period_end = period_end
            await self._db.commit()
            await self._db.refresh(existing)
            return existing

        sub = Subscription(
            provider_id=profile.id,
            stripe_subscription_id=stripe_sub_id,
            tier=tier,
            status=stripe_status,
            current_period_end=period_end,
        )
        self._db.add(sub)
        await self._db.commit()
        await self._db.refresh(sub)
        return sub
