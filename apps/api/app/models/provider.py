import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SubscriptionTier(str, enum.Enum):
    BASIC = "BASIC"
    PRO = "PRO"
    PREMIUM = "PREMIUM"


class ProviderProfile(Base):
    __tablename__ = "provider_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    # List of ServiceType enum strings stored as a PostgreSQL ARRAY
    services: Mapped[list[str]] = mapped_column(ARRAY(String(50)), nullable=False, default=list)
    hourly_rate: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    service_radius_miles: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    # PostGIS geography point: GEOGRAPHY(POINT, 4326)
    location: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    service_area: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subscription_tier: Mapped[SubscriptionTier | None] = mapped_column(
        Enum(SubscriptionTier), nullable=True
    )
    subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    slug: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    photos: Mapped[list[str]] = mapped_column(ARRAY(String(500)), nullable=False, default=list)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    availability_blocks: Mapped[list["Availability"]] = relationship(
        back_populates="provider", cascade="all, delete-orphan"
    )
    subscription: Mapped["Subscription | None"] = relationship(
        back_populates="provider", uselist=False
    )


class Availability(Base):
    """A time block that a provider is available. May be one-time or recurring (rrule)."""

    __tablename__ = "availability"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # RFC 5545 rrule string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z"
    # NULL means this is a single non-recurring block.
    rrule_string: Mapped[str | None] = mapped_column(String(500), nullable=True)

    provider: Mapped["ProviderProfile"] = relationship(back_populates="availability_blocks")


class Subscription(Base):
    """Tracks a provider's active Stripe subscription to the platform."""

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    stripe_subscription_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    tier: Mapped[SubscriptionTier] = mapped_column(Enum(SubscriptionTier), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # Stripe status string
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    provider: Mapped["ProviderProfile"] = relationship(back_populates="subscription")
