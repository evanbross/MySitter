# Import all models here so Alembic's autogenerate can discover them.
from app.core.database import Base  # noqa: F401
from app.models.booking import Booking, BookingOccurrence  # noqa: F401
from app.models.messaging import Conversation, Message  # noqa: F401
from app.models.provider import Availability, ProviderProfile, Subscription  # noqa: F401
from app.models.user import PasskeyCredential, User  # noqa: F401
from app.models.review import Review  # noqa: F401

__all__ = [
    "Base",
    "User",
    "PasskeyCredential",
    "ProviderProfile",
    "Availability",
    "Subscription",
    "Booking",
    "BookingOccurrence",
    "Review",
    "Conversation",
    "Message",
]
