import uuid

from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.booking import Booking, BookingStatus
from app.models.messaging import Conversation, Message
from app.models.provider import ProviderProfile, Subscription
from app.models.review import Review
from app.models.user import User, UserRole
from app.schemas.booking import BookingResponse
from app.schemas.provider import ProviderProfileResponse
from app.schemas.review import ReviewResponse
from app.schemas.user import UserResponse, UserUpdateRequest
from app.schemas.messaging import ConversationOut, MessageOut
from app.schemas.billing import SubscriptionResponse

router = APIRouter(prefix="/admin", tags=["admin"])
_admin_only = require_role(UserRole.ADMIN)


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(User))
    rows = list((await db.execute(select(User).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"users {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


# ── Providers ─────────────────────────────────────────────────────────────────

@router.get("/providers", response_model=list[ProviderProfileResponse])
async def list_providers(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[ProviderProfile]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(ProviderProfile))
    rows = list((await db.execute(select(ProviderProfile).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"providers {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows

class _AdminProviderUpdate(BaseModel):
    is_active: bool | None = None


@router.put("/providers/{profile_id}", response_model=ProviderProfileResponse)
async def admin_update_provider(
    profile_id: uuid.UUID,
    body: _AdminProviderUpdate,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfile:
    profile = await db.get(ProviderProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if body.is_active is not None:
        profile.is_active = body.is_active
    await db.commit()
    await db.refresh(profile)
    return profile


@router.patch("/providers/{profile_id}/activate", response_model=ProviderProfileResponse)
async def activate_provider(
    profile_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> ProviderProfile:
    profile = await db.get(ProviderProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    profile.is_active = True
    await db.commit()
    await db.refresh(profile)
    return profile

@router.patch("/providers/{profile_id}/deactivate", response_model=ProviderProfileResponse)
async def deactivate_provider(
    profile_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> ProviderProfile:
    profile = await db.get(ProviderProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    profile.is_active = False
    await db.commit()
    await db.refresh(profile)
    return profile


# ── Bookings ──────────────────────────────────────────────────────────────────

@router.get("/bookings", response_model=list[BookingResponse])
async def list_bookings(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[Booking]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(Booking))
    rows = list((await db.execute(select(Booking).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"bookings {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows

@router.patch("/bookings/{booking_id}/cancel", response_model=BookingResponse)
async def admin_cancel_booking(
    booking_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> Booking:
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    booking.status = BookingStatus.CANCELLED
    await db.commit()
    await db.refresh(booking)
    return booking


class _AdminBookingUpdate(BaseModel):
    status: BookingStatus | None = None


@router.put("/bookings/{booking_id}", response_model=BookingResponse)
async def admin_update_booking(
    booking_id: uuid.UUID,
    body: _AdminBookingUpdate,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if body.status is not None:
        booking.status = body.status
    await db.commit()
    await db.refresh(booking)
    return booking


# ── Conversations (moderation) ────────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[Conversation]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(Conversation))
    rows = list((await db.execute(select(Conversation).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"conversations {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[Message]:
    rows = list((await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )).scalars())
    return rows


# React Admin's ReferenceManyField calls GET /admin/messages?conversation_id={id}
@router.get("/messages", response_model=list[MessageOut])
async def list_messages(
    response: Response,
    conversation_id: uuid.UUID = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> list[Message]:
    offset = (page - 1) * page_size
    base_q = select(Message).where(Message.conversation_id == conversation_id)
    total = await db.scalar(select(func.count()).select_from(base_q.subquery())) or 0
    rows = list(
        (await db.execute(
            base_q.order_by(Message.created_at.asc()).offset(offset).limit(page_size)
        )).scalars()
    )
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"messages {offset}-{max(end, 0)}/{total}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows


# ── Subscriptions ─────────────────────────────────────────────────────────────

@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[Subscription]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(Subscription))
    rows = list((await db.execute(select(Subscription).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"subscriptions {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.get("/reviews", response_model=list[ReviewResponse])
async def list_reviews(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> list[Review]:
    offset = (page - 1) * page_size
    total = await db.scalar(select(func.count()).select_from(Review))
    rows = list((await db.execute(select(Review).offset(offset).limit(page_size))).scalars())
    end = offset + len(rows) - 1
    response.headers["Content-Range"] = f"reviews {offset}-{max(end, 0)}/{total or 0}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return rows

@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db)
) -> None:
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await db.delete(review)
    await db.commit()
