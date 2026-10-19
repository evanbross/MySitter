# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, get_read_db
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.review import PaginatedReviews, ReviewCreateRequest, ReviewResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post(
    "/bookings/{booking_id}",
    response_model=ReviewResponse,
    status_code=201,
)
@limiter.limit("5/minute")
async def create_review(
    request: Request,
    booking_id: uuid.UUID,
    body: ReviewCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    review = await ReviewService(db).create(current_user, booking_id, body)
    return ReviewResponse.model_validate(review)


@router.get(
    "/bookings/{booking_id}/my-review",
    response_model=ReviewResponse | None,
)
async def get_my_review(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse | None:
    review = await ReviewService(db).get_my_review(current_user, booking_id)
    return ReviewResponse.model_validate(review) if review else None


@router.get(
    "/providers/{provider_id}/reviews",
    response_model=PaginatedReviews,
)
async def list_provider_reviews(
    provider_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_read_db),
) -> PaginatedReviews:
    return await ReviewService(db).list_for_provider(provider_id, page, page_size)
