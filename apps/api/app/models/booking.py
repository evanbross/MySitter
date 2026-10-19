# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class ServiceType(str, enum.Enum):
    PET_SITTING = "PET_SITTING"
    HOUSE_SITTING = "HOUSE_SITTING"
    DOG_WALKING = "DOG_WALKING"
    DROP_IN_VISIT = "DROP_IN_VISIT"
    DOGGY_DAY_CARE = "DOGGY_DAY_CARE"
    BOARDING = "BOARDING"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), nullable=False, default=BookingStatus.PENDING
    )
    service_type: Mapped[ServiceType] = mapped_column(Enum(ServiceType), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rrule_string: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    occurrences: Mapped[list["BookingOccurrence"]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="booking")


class BookingOccurrence(Base):
    """One expanded instance of a (possibly recurring) booking."""

    __tablename__ = "booking_occurrences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), nullable=False, default=BookingStatus.CONFIRMED
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    booking: Mapped["Booking"] = relationship(back_populates="occurrences")
