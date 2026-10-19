# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    body: str | None = None


class ReviewResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int
    body: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedReviews(BaseModel):
    items: list[ReviewResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
