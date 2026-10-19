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

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PetType(str, enum.Enum):
    DOG = "DOG"
    CAT = "CAT"
    BIRD = "BIRD"
    FISH = "FISH"
    RABBIT = "RABBIT"
    REPTILE = "REPTILE"
    OTHER = "OTHER"


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    home_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    has_yard: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    pet_names: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    pet_types: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    pet_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
