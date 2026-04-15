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
import pathlib
from datetime import datetime, timezone

from jinja2 import Environment, FileSystemLoader, select_autoescape

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
