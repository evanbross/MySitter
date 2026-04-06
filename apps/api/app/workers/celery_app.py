from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "mywatcher",
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
        # Expand recurring booking occurrences 8 weeks ahead, runs daily
        "expand-recurring-bookings": {
            "task": "app.workers.tasks.expand_recurring_bookings",
            "schedule": 60 * 60 * 24,  # every 24 hours
        },
    },
)
