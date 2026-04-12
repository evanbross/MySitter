"""
Billing router: provider subscription management via Stripe.

Routes:
  POST /billing/subscribe      — start a new subscription, returns client_secret
  GET  /billing/portal         — returns Stripe Customer Portal URL
  GET  /billing/subscription   — returns current Subscription for logged-in provider
  POST /billing/webhook        — raw Stripe webhook (no auth, signature-verified)

IMPORTANT: The webhook endpoint reads the raw request body directly.
FastAPI body parsing consumes the stream, which would break Stripe signature
verification — never declare a Pydantic body model on /billing/webhook.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.user import User, UserRole
from app.schemas.billing import (
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionResponse,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/subscribe", response_model=SubscribeResponse, status_code=201)
async def subscribe(
    body: SubscribeRequest,
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> SubscribeResponse:
    from app.models.provider import SubscriptionTier
    from app.services.stripe_service import StripeService

    try:
        tier = SubscriptionTier(body.tier.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid tier. Must be one of: {[t.value for t in SubscriptionTier]}",
        )
    result = await StripeService(db).create_subscription(current_user, tier)
    return SubscribeResponse(client_secret=result["client_secret"])


@router.get("/portal")
async def get_portal_url(
    return_url: str = Query(..., description="URL to redirect to after leaving the portal"),
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.stripe_service import StripeService

    url = await StripeService(db).get_portal_url(current_user, return_url)
    return {"url": url}


@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription(
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionResponse | None:
    from app.services.stripe_service import StripeService

    return await StripeService(db).get_subscription(current_user)


@router.post("/webhook", status_code=200)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Stripe webhook endpoint. No auth — verified by Stripe-Signature header.
    Must read raw bytes before any parsing to preserve the signature.
    """
    from app.services.stripe_service import StripeService

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    await StripeService(db).handle_webhook(payload, sig_header)
    return {"received": True}
