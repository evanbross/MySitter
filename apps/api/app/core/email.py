"""
Email rendering via Jinja2 templates.

Templates live in apps/api/app/email_templates/.

EmailRenderer wraps a Jinja2 Environment that is constructed once and reused
across all Celery worker threads — Environment is thread-safe for rendering
because it holds no per-render mutable state.

Usage (in a Celery task):
    from app.core.email import email_renderer

    html = email_renderer.render(
        "booking_notification.html",
        user_name="Alice",
        message="Your booking is confirmed.",
        event="CONFIRMED",
        booking_start="Monday, May 12 at 10:00 AM",
        service_type="Pet Sitting",
    )
"""
import logging
import pathlib
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

from app.core.config import settings

_TEMPLATE_DIR = pathlib.Path(__file__).parent.parent / "email_templates"


class EmailRenderer:
    """Renders HTML email bodies from Jinja2 templates."""

    def __init__(self, template_dir: pathlib.Path = _TEMPLATE_DIR) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            # Auto-escape HTML to prevent XSS if user-supplied strings land in templates.
            autoescape=select_autoescape(["html"]),
        )
        self._app_url = settings.app_url

    def render(self, template_name: str, **context: object) -> str:
        """
        Render a template and return the HTML string.

        Two variables are injected automatically so templates never need callers
        to pass them:
          - ``app_url``: the public root URL of the app (from settings).
          - ``current_year``: the current UTC year for footer copyright.

        Args:
            template_name: Filename relative to the template directory
                           (e.g. "booking_notification.html").
            **context:     Additional template variables.

        Returns:
            Rendered HTML string.
        """
        merged: dict[str, object] = {
            "app_url": self._app_url,
            "current_year": datetime.now(timezone.utc).year,
            **context,
        }
        template = self._env.get_template(template_name)
        return template.render(**merged)


# Module-level singleton — safe to share across Celery worker threads.
email_renderer = EmailRenderer()


def send_email_sync(to: str, subject: str, html: str) -> None:
    """
    Send an HTML email via SMTP (ForwardEmail). No-ops if smtp_username is unset.
    Safe to call from Celery workers (synchronous, no event loop required).
    """
    if not settings.smtp_username or not settings.smtp_password:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    logger.info("Sending email to=%s subject=%r via %s:%s from=%s", to, subject, settings.smtp_host, settings.smtp_port, settings.email_from)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.sendmail(settings.email_from, [to], msg.as_string())
    logger.info("Email sent successfully to=%s", to)


async def send_email_async(to: str, subject: str, html: str) -> None:
    """Async wrapper around send_email_sync — runs in a thread to avoid blocking the event loop."""
    import asyncio
    await asyncio.to_thread(send_email_sync, to, subject, html)
