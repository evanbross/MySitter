"""HTML email templates for transactional emails."""
from dataclasses import dataclass

_BASE_STYLE = (
    'font-family:sans-serif;background:#f3f4f6;padding:32px 0;'
)
_CARD_STYLE = (
    'background:#ffffff;border-radius:8px;max-width:560px;margin:0 auto;'
    'overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);'
)
_HEADER_STYLE = (
    'background:#1a1a2e;padding:24px 32px;'
)
_HEADER_TEXT_STYLE = (
    'color:#ffffff;font-size:20px;font-weight:700;margin:0;'
)
_BODY_STYLE = (
    'padding:28px 32px;color:#374151;font-size:14px;line-height:1.6;'
)
_BTN_STYLE = (
    'display:inline-block;background:#4338ca;color:#ffffff;'
    'text-decoration:none;border-radius:6px;padding:12px 24px;'
    'font-size:14px;font-weight:600;margin-top:16px;'
)
_FOOTER_STYLE = (
    'padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;'
)


def _wrap(header: str, body_html: str, cta_html: str = "") -> str:
    return (
        f'<div style="{_BASE_STYLE}">'
        f'<div style="{_CARD_STYLE}">'
        f'<div style="{_HEADER_STYLE}"><p style="{_HEADER_TEXT_STYLE}">{header}</p></div>'
        f'<div style="{_BODY_STYLE}">{body_html}{cta_html}</div>'
        f'<div style="{_FOOTER_STYLE}">You received this email because you have an account on MySitter.</div>'
        f'</div></div>'
    )


@dataclass
class BookingRequestTemplate:
    provider_name: str
    customer_name: str
    start_at: str
    end_at: str
    service_type: str

    def subject(self) -> str:
        return f"New booking request from {self.customer_name}"

    def html_body(self) -> str:
        body = (
            f"<p>Hi {self.provider_name},</p>"
            f"<p><strong>{self.customer_name}</strong> has requested a "
            f"<strong>{self.service_type}</strong> booking:</p>"
            f"<table style='border-collapse:collapse;width:100%;margin:12px 0;'>"
            f"<tr><td style='padding:6px 0;color:#6b7280;width:120px;'>From</td>"
            f"<td style='padding:6px 0;font-weight:600;'>{self.start_at}</td></tr>"
            f"<tr><td style='padding:6px 0;color:#6b7280;'>To</td>"
            f"<td style='padding:6px 0;font-weight:600;'>{self.end_at}</td></tr>"
            f"</table>"
            f"<p>Log in to confirm or decline this request.</p>"
        )
        return _wrap("New Booking Request", body)


@dataclass
class BookingConfirmedTemplate:
    customer_name: str
    provider_name: str
    start_at: str
    end_at: str

    def subject(self) -> str:
        return "Your booking has been confirmed"

    def html_body(self) -> str:
        body = (
            f"<p>Hi {self.customer_name},</p>"
            f"<p>Your booking with <strong>{self.provider_name}</strong> is confirmed:</p>"
            f"<table style='border-collapse:collapse;width:100%;margin:12px 0;'>"
            f"<tr><td style='padding:6px 0;color:#6b7280;width:120px;'>From</td>"
            f"<td style='padding:6px 0;font-weight:600;'>{self.start_at}</td></tr>"
            f"<tr><td style='padding:6px 0;color:#6b7280;'>To</td>"
            f"<td style='padding:6px 0;font-weight:600;'>{self.end_at}</td></tr>"
            f"</table>"
        )
        return _wrap("Booking Confirmed ✓", body)


@dataclass
class BookingCancelledTemplate:
    recipient_name: str
    booking_start_at: str

    def subject(self) -> str:
        return "Booking cancelled"

    def html_body(self) -> str:
        body = (
            f"<p>Hi {self.recipient_name},</p>"
            f"<p>Your booking scheduled for <strong>{self.booking_start_at}</strong> "
            f"has been cancelled.</p>"
            f"<p>If you have any questions, please contact support.</p>"
        )
        return _wrap("Booking Cancelled", body)


@dataclass
class BookingCompletedTemplate:
    customer_name: str
    provider_name: str
    review_link: str

    def subject(self) -> str:
        return "Your session is complete — leave a review"

    def html_body(self) -> str:
        cta = f'<a href="{self.review_link}" style="{_BTN_STYLE}">Leave a Review</a>'
        body = (
            f"<p>Hi {self.customer_name},</p>"
            f"<p>Your session with <strong>{self.provider_name}</strong> is complete. "
            f"We'd love to hear how it went!</p>"
            f"<p>Your review helps other pet owners find great sitters.</p>"
        )
        return _wrap("Session Complete", body, cta)


@dataclass
class SubscriptionRenewalTemplate:
    user_name: str
    tier: str
    renewal_date: str
    portal_url: str

    def subject(self) -> str:
        return f"Your MySitter {self.tier} subscription is active"

    def html_body(self) -> str:
        cta = f'<a href="{self.portal_url}" style="{_BTN_STYLE}">Manage Subscription</a>'
        body = (
            f"<p>Hi {self.user_name},</p>"
            f"<p>Your <strong>{self.tier}</strong> subscription has been renewed. "
            f"Your next renewal date is <strong>{self.renewal_date}</strong>.</p>"
            f"<p>You can manage your subscription at any time:</p>"
        )
        return _wrap(f"MySitter {self.tier} Active", body, cta)