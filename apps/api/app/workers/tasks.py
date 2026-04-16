"""
Celery tasks for background processing.
Each task is designed to be idempotent where possible.

All tasks use synchronous SQLAlchemy sessions because Celery workers run
in a plain thread, not an asyncio event loop.
"""
import uuid
from datetime import datetime, timedelta, timezone

import requests
from dateutil.rrule import rrulestr
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session as SyncSession

from app.core.config import settings
from app.core.email import email_renderer
from app.models.booking import Booking, BookingOccurrence, BookingStatus
from app.models.messaging import Conversation, Message
from app.models.user import User
from app.workers.celery_app import celery_app

# ─── Booking tasks ────────────────────────────────────────────────────────────


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_notification(self, booking_id: str, event: str) -> None:
    """
    Send email + SMS + push notification for a booking status change.
    event: PENDING | CONFIRMED | CANCELLED | COMPLETED
    """
    try:
        _notify_booking(booking_id, event)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_reminder(self, booking_id: str) -> None:
    """Send a 24-hour reminder before a booking occurrence."""
    try:
        _notify_booking(booking_id, "REMINDER")
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task
def expand_recurring_bookings() -> None:
    """
    For every CONFIRMED recurring booking, generate BookingOccurrence rows
    for the next 8 weeks. Safe to run multiple times — skips existing occurrences.
    """
    horizon = datetime.now(timezone.utc) + timedelta(weeks=8)
    engine = create_engine(settings.database_sync_url)

    with SyncSession(engine) as session:
        recurring = session.scalars(
            select(Booking).where(
                Booking.rrule_string.isnot(None),
                Booking.status == BookingStatus.CONFIRMED,
            )
        ).all()

        for booking in recurring:
            rule = rrulestr(booking.rrule_string, dtstart=booking.start_at)
            duration = booking.end_at - booking.start_at

            existing: set[datetime] = {
                occ.scheduled_at
                for occ in session.scalars(
                    select(BookingOccurrence).where(
                        BookingOccurrence.booking_id == booking.id
                    )
                )
            }

            for dt in rule.between(datetime.now(timezone.utc), horizon, inc=True):
                if dt not in existing:
                    session.add(
                        BookingOccurrence(
                            booking_id=booking.id,
                            scheduled_at=dt,
                            status=BookingStatus.CONFIRMED,
                        )
                    )

        session.commit()

    engine.dispose()


@celery_app.task
def dispatch_booking_reminders() -> None:
    """
    Find all CONFIRMED bookings whose start_at is between 23h and 25h from now
    and enqueue a send_booking_reminder task for each.
    """
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(hours=23)
    window_end = now + timedelta(hours=25)

    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        upcoming = session.scalars(
            select(Booking).where(
                Booking.status == BookingStatus.CONFIRMED,
                Booking.start_at >= window_start,
                Booking.start_at <= window_end,
            )
        ).all()
        for booking in upcoming:
            send_booking_reminder.delay(str(booking.id))
    engine.dispose()


@celery_app.task
def deactivate_expired_grace_periods() -> None:
    """
    Find ProviderProfiles in 'grace_period' subscription_status whose
    Subscription.current_period_end has passed, and deactivate their listings.
    """
    from app.models.provider import ProviderProfile, Subscription

    now = datetime.now(timezone.utc)
    engine = create_engine(settings.database_sync_url)

    with SyncSession(engine) as session:
        expired = session.scalars(
            select(ProviderProfile)
            .join(Subscription, Subscription.provider_id == ProviderProfile.id)
            .where(
                ProviderProfile.subscription_status == "grace_period",
                Subscription.current_period_end < now,
            )
        ).all()

        for profile in expired:
            profile.is_active = False
            profile.subscription_status = "expired"

        session.commit()

    engine.dispose()


# ─── Message tasks ────────────────────────────────────────────────────────────


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: str) -> None:
    """Send a welcome email to a newly registered user."""
    try:
        _send_welcome(user_id)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def notify_new_message(self, message_id: str) -> None:
    """
    Send a push notification for a new message.
    Called only when the recipient has no active WebSocket connection.
    """
    try:
        _notify_new_message(message_id)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_offline_message_email(self, message_id: str) -> None:
    """
    Send an email notification for an unread message.
    Called with countdown=300 (5 minutes) from the send_message endpoint.
    The task checks read_at just before sending — if the recipient has
    since opened the app and read the message, it skips the email.
    """
    try:
        _send_offline_message_email(message_id)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_admin_notification(
    self,
    user_id: str,
    subject: str,
    message: str,
    channels: list[str],
) -> None:
    """Send an admin-triggered notification to a single user via requested channels."""
    try:
        _send_admin_notification(user_id, subject, message, channels)
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_subscription_renewal_email(
    self, user_id: str, tier: str, period_end_iso: str
) -> None:
    """Send a subscription activated/renewed confirmation email."""
    try:
        _send_subscription_renewal_email(user_id, tier, period_end_iso)
    except Exception as exc:
        raise self.retry(exc=exc)


# ─── Referral tasks ───────────────────────────────────────────────────────────


@celery_app.task
def dispatch_referral_rewards() -> None:
    """
    Find CLAIMED referrals whose referred user has completed at least one booking,
    issue a Stripe coupon to the referrer, and mark the referral as REWARDED.

    Runs nightly. Idempotent — REWARDED referrals are skipped because they are
    filtered by status == CLAIMED.
    """
    from app.models.booking import Booking, BookingStatus
    from app.models.referral import Referral, ReferralStatus

    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        # Find all CLAIMED referrals.
        claimed = session.scalars(
            select(Referral).where(Referral.status == ReferralStatus.CLAIMED)
        ).all()

        for referral in claimed:
            if not referral.referred_id:
                continue

            # Check if the referred user has at least one COMPLETED booking.
            has_completed = session.scalar(
                select(func.count())
                .select_from(Booking)
                .where(
                    Booking.customer_id == referral.referred_id,
                    Booking.status == BookingStatus.COMPLETED,
                )
            ) or 0

            if has_completed == 0:
                continue

            # Issue the reward — enqueue per-referral so failures are isolated.
            issue_referral_reward.delay(str(referral.id))

        session.commit()

    engine.dispose()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def issue_referral_reward(self, referral_id: str) -> None:
    """
    Issue a one-month free coupon to the referrer via Stripe and mark the
    referral as REWARDED. Retries up to 3 times on failure.
    """
    try:
        _issue_referral_reward(referral_id)
    except Exception as exc:
        raise self.retry(exc=exc)


# ─── Implementation helpers ───────────────────────────────────────────────────


def _issue_referral_reward(referral_id: str) -> None:
    """
    Helper (synchronous) — loads the referral, issues a Stripe coupon, marks REWARDED.

    Coupon: one free month applied as a 100% discount for one invoice cycle.
    Uses Stripe's Customer-level promotion code so it applies automatically
    on the next renewal invoice.
    """
    import stripe
    from app.models.referral import Referral, ReferralStatus
    from app.models.provider import ProviderProfile
    from datetime import datetime, timezone

    stripe.api_key = settings.stripe_secret_key

    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        referral = session.get(Referral, referral_id)
        if not referral or referral.status != ReferralStatus.CLAIMED:
            # Already rewarded or not found — idempotent exit.
            return

        # Resolve the referrer's Stripe customer ID via their ProviderProfile.
        profile = session.scalar(
            select(ProviderProfile).where(ProviderProfile.user_id == referral.referrer_id)
        )

        if profile and profile.stripe_customer_id and settings.stripe_secret_key:
            # Create a one-time coupon (100% off for one invoice cycle).
            # The credit amount is hardcoded to the Pro tier price as a reasonable default.
            # A future improvement would look up the referrer's actual subscription tier
            # and credit the matching amount.
            stripe.Customer.create_balance_transaction(
                profile.stripe_customer_id,
                amount=-3900,
                currency="usd",
                description=f"Referral reward for code {referral.code}",
            )

        referral.status = ReferralStatus.REWARDED
        referral.rewarded_at = datetime.now(timezone.utc)
        session.commit()

    engine.dispose()


def _send_subscription_renewal_email(user_id: str, tier: str, period_end_iso: str) -> None:
    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        user = session.scalar(select(User).where(User.id == uuid.UUID(user_id)))
        if not user or not settings.resend_api_key:
            return

        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [user.email],
            "subject": f"Your MySitter {tier} subscription is active",
            "html": email_renderer.render(
                "subscription_renewal.html",
                user_name=user.display_name,
                tier=tier,
                period_end=datetime.fromisoformat(period_end_iso).strftime("%B %d, %Y"),
            ),
        })
    engine.dispose()


def _send_admin_notification(user_id: str, subject: str, message: str, channels: list[str]) -> None:
    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        user = session.scalar(select(User).where(User.id == uuid.UUID(user_id)))
        if not user:
            return

        if "email" in channels and settings.resend_api_key:
            import resend
            resend.api_key = settings.resend_api_key
            resend.Emails.send({
                "from": settings.email_from,
                "to": [user.email],
                "subject": subject,
                "html": message,
            })
        
        if "sms" in channels and user.phone and settings.twilio_account_sid and settings.twilio_auth_token:
            from twilio.rest import Client as TwilioClient
            twilio = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
            twilio.messages.create(
                body=message,
                from_=settings.twilio_from_number,
                to=user.phone,
            )

        if "push" in channels and user.expo_push_token:
            _send_expo_push(
                token=user.expo_push_token,
                title=subject,
                body=message,
            )
    engine.dispose()


def _send_offline_message_email(message_id: str) -> None:
    """Load the message and send an email notification to the recipient if still unread."""
    engine = create_engine(settings.database_sync_url)

    with SyncSession(engine) as session:
        msg = session.scalar(
            select(Message).where(Message.id == uuid.UUID(message_id))
        )
        if not msg or msg.read_at is not None:
            return

        conv = session.scalar(
            select(Conversation).where(Conversation.id == msg.conversation_id)
        )
        if not conv:
            return

        recipient_id = (
            conv.provider_id if msg.sender_id == conv.customer_id else conv.customer_id
        )
        recipient = session.scalar(select(User).where(User.id == recipient_id))
        sender = session.scalar(select(User).where(User.id == msg.sender_id))

        if not recipient or not sender or not settings.resend_api_key:
            return

        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [recipient.email],
            "subject": f"You have an unread message from {sender.display_name}",
            "html": email_renderer.render(
                "message_notification.html",
                sender_name=sender.display_name,
                message_body=msg.body,
            ),
        })

    engine.dispose()


def _notify_booking(booking_id: str, event: str) -> None:
    """
    Load the booking and dispatch notifications via Resend (email),
    Twilio (SMS), and Expo Push.

    This runs inside a Celery worker process using a synchronous DB session.
    """
    engine = create_engine(settings.database_sync_url)

    with SyncSession(engine) as session:
        booking = session.scalar(
            select(Booking).where(Booking.id == uuid.UUID(booking_id))
        )
        if not booking:
            return

        customer = session.scalar(select(User).where(User.id == booking.customer_id))
        # booking.provider_id references provider_profiles.id, not users.id directly.
        # Load the provider's user via ProviderProfile.
        from app.models.provider import ProviderProfile

        profile = session.scalar(
            select(ProviderProfile).where(ProviderProfile.id == booking.provider_id)
        )
        provider = session.scalar(
            select(User).where(User.id == profile.user_id)
        ) if profile else None

        if not customer or not provider:
            return

        subject, customer_body, provider_body = _booking_notification_copy(
            event, customer, provider, booking
        )

        # Email — send to relevant party based on event
        if settings.resend_api_key:
            import resend

            booking_start = booking.start_at.strftime("%A, %B %d at %I:%M %p").replace(
                " 0", " "
            )
            resend.api_key = settings.resend_api_key
            if event in ("PENDING",):
                # Provider receives new request
                resend.Emails.send({
                    "from": settings.email_from,
                    "to": [provider.email],
                    "subject": subject,
                    "html": email_renderer.render(
                        "booking_notification.html",
                        user_name=provider.display_name,
                        message=provider_body,
                        event=event,
                        booking_start=booking_start,
                        service_type=booking.service_type.value,
                    ),
                })
            else:
                # Customer receives status update
                resend.Emails.send({
                    "from": settings.email_from,
                    "to": [customer.email],
                    "subject": subject,
                    "html": email_renderer.render(
                        "booking_notification.html",
                        user_name=customer.display_name,
                        message=customer_body,
                        event=event,
                        booking_start=booking_start,
                        service_type=booking.service_type.value,
                    ),
                })

        # SMS — send to relevant party if they have a phone number
        if settings.twilio_account_sid and settings.twilio_auth_token:
            from twilio.rest import Client as TwilioClient

            twilio = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
            recipient = provider if event == "PENDING" else customer
            sms_body = provider_body if event == "PENDING" else customer_body

            if recipient.phone:
                twilio.messages.create(
                    body=sms_body,
                    from_=settings.twilio_from_number,
                    to=recipient.phone,
                )

        # Push — Expo push notification
        recipient = provider if event == "PENDING" else customer
        push_body = provider_body if event == "PENDING" else customer_body
        if recipient.expo_push_token:
            _send_expo_push(
                token=recipient.expo_push_token,
                title=subject,
                body=push_body,
                data={"bookingId": str(booking.id)},
            )

    engine.dispose()


def _notify_new_message(message_id: str) -> None:
    """Load the message and send a push notification to the recipient."""
    engine = create_engine(settings.database_sync_url)

    with SyncSession(engine) as session:
        msg = session.scalar(
            select(Message).where(Message.id == uuid.UUID(message_id))
        )
        if not msg:
            return

        conv = session.scalar(
            select(Conversation).where(Conversation.id == msg.conversation_id)
        )
        if not conv:
            return

        recipient_id = (
            conv.provider_id if msg.sender_id == conv.customer_id else conv.customer_id
        )
        recipient = session.scalar(select(User).where(User.id == recipient_id))
        sender = session.scalar(select(User).where(User.id == msg.sender_id))

        if not recipient or not recipient.expo_push_token or not sender:
            return

        _send_expo_push(
            token=recipient.expo_push_token,
            title=f"New message from {sender.display_name}",
            body=msg.body[:150],
            data={"conversationId": str(conv.id)},
        )

    engine.dispose()


def _send_expo_push(
    token: str, title: str, body: str, data: dict | None = None
) -> None:
    """POST a single push message to the Expo Push API."""
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
    }
    if data:
        payload["data"] = data

    resp = requests.post(
        "https://exp.host/--/api/v2/push/send",
        json=payload,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=10,
    )
    resp.raise_for_status()


def _booking_notification_copy(
    event: str,
    customer: "User",
    provider: "User",
    booking: "Booking",
) -> tuple[str, str, str]:
    """
    Return (subject, customer_message, provider_message) for a booking event.
    """
    start = booking.start_at.strftime("%A, %B %d at %I:%M %p").replace(" 0", " ")

    if event == "PENDING":
        return (
            f"New booking request from {customer.display_name}",
            f"Your booking request for {start} has been sent.",
            f"{customer.display_name} has requested a booking on {start}.",
        )
    if event == "CONFIRMED":
        return (
            "Your booking has been confirmed",
            f"Your booking on {start} with {provider.display_name} is confirmed!",
            f"You confirmed a booking with {customer.display_name} on {start}.",
        )
    if event == "CANCELLED":
        return (
            "Booking cancelled",
            f"Your booking on {start} has been cancelled.",
            f"The booking with {customer.display_name} on {start} was cancelled.",
        )
    if event == "COMPLETED":
        return (
            "Booking completed",
            f"Your session on {start} is complete. Please leave a review!",
            f"Your session with {customer.display_name} on {start} is complete.",
        )
    if event == "REMINDER":
        return (
            f"Reminder: booking tomorrow",
            f"Reminder: you have a session with {provider.display_name} on {start}.",
            f"Reminder: session with {customer.display_name} on {start}.",
        )
    return ("Booking update", "Your booking has been updated.", "A booking has been updated.")


def _send_welcome(user_id: str) -> None:
    """Load the user and send a welcome email via Resend."""
    if not settings.resend_api_key:
        return

    engine = create_engine(settings.database_sync_url)
    with SyncSession(engine) as session:
        user = session.scalar(select(User).where(User.id == uuid.UUID(user_id)))
        if not user:
            return

        import resend

        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [user.email],
            "subject": f"Welcome to mysitter, {user.display_name}!",
            "html": email_renderer.render("welcome.html", user_name=user.display_name),
        })

    engine.dispose()
