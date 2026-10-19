# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "mysitter",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,          # don't ack until task completes (safer)
    worker_prefetch_multiplier=1, # fair scheduling
    beat_schedule={
        "expand-recurring-bookings": {
            "task": "app.workers.tasks.expand_recurring_bookings",
            "schedule": 60 * 60 * 24,
        },
        "send-24h-booking-reminders": {
            "task": "app.workers.tasks.dispatch_booking_reminders",
            "schedule": 60 * 60,  # check every hour
        },
        "deactivate-expired-grace-period-listings": {
            "task": "app.workers.tasks.deactivate_expired_grace_periods",
            "schedule": 60 * 60 * 24,  # once daily
        },
        "dispatch-referral-rewards": {
            "task": "app.workers.tasks.dispatch_referral_rewards",
            "schedule": 60 * 60 * 24,  # once daily at midnight (default beat anchor)
        },
    },
)
