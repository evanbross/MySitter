# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    PaginatedBookings,
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(
    body: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    from app.services.booking_service import BookingService
    return await BookingService(db).create(current_user, body)


@router.get("", response_model=PaginatedBookings)
async def list_bookings(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedBookings:
    from app.services.booking_service import BookingService
    return await BookingService(db).list_for_user(current_user, status, page)


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    from app.services.booking_service import BookingService
    return await BookingService(db).get_for_user(current_user, booking_id)


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
async def confirm_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    from app.services.booking_service import BookingService
    return await BookingService(db).confirm(current_user, booking_id)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    from app.services.booking_service import BookingService
    return await BookingService(db).cancel(current_user, booking_id)


@router.post("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingResponse:
    """Mark a CONFIRMED booking as COMPLETED. Provider-only."""
    from app.services.booking_service import BookingService
    return await BookingService(db).complete(current_user, booking_id)
