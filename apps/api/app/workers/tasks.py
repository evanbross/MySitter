"""
Celery tasks for background processing.
Each task is designed to be idempotent where possible.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.workers.celery_app import celery_app


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
    For every active recurring booking, generate BookingOccurrence rows
    up to 8 weeks ahead. Safe to run multiple times (checks for existing rows).
    """
    # TODO: implement with synchronous SQLAlchemy session
    # (Celery tasks are sync; use create_engine + sessionmaker, not async)
    pass


def _notify_booking(booking_id: str, event: str) -> None:
    """
    Load the booking and dispatch notifications via Resend (email),
    Twilio (SMS), and Expo Push.

    This function runs inside a Celery worker process. It uses a synchronous
    database session (not asyncpg) since Celery tasks are not async.
    """
    # TODO: implement once Resend / Twilio / Expo Push credentials are configured
    # Pattern:
    #   1. Open sync SQLAlchemy session
    #   2. Load Booking + customer + provider User rows
    #   3. Send email via resend.Emails.send(...)
    #   4. Send SMS via twilio_client.messages.create(...)
    #   5. Send push via httpx to Expo Push API
    pass
