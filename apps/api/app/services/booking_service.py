"""BookingService: create, list, confirm, cancel bookings and post reviews."""
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus, Review
from app.models.user import User, UserRole
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    PaginatedBookings,
    ReviewCreateRequest,
    ReviewResponse,
)

_PAGE_SIZE = 20


class BookingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, user: User, body: BookingCreateRequest) -> Booking:
        booking = Booking(
            customer_id=user.id,
            provider_id=body.provider_id,
            service_type=body.service_type,
            start_at=body.start_at,
            end_at=body.end_at,
            rrule_string=body.rrule_string,
            notes=body.notes,
            status=BookingStatus.PENDING,
        )
        self._db.add(booking)
        await self._db.commit()
        await self._db.refresh(booking)

        # Kick off notification task asynchronously
        from app.workers.tasks import send_booking_notification
        send_booking_notification.delay(str(booking.id), "PENDING")

        return booking

    async def list_for_user(
        self, user: User, filter_status: str | None, page: int
    ) -> PaginatedBookings:
        q = select(Booking)
        if user.role == UserRole.PROVIDER:
            from sqlalchemy import select as sa_select
            from app.models.provider import ProviderProfile
            profile_id = await self._db.scalar(
                sa_select(ProviderProfile.id).where(ProviderProfile.user_id == user.id)
            )
            q = q.where(Booking.provider_id == profile_id)
        else:
            q = q.where(Booking.customer_id == user.id)

        if filter_status:
            q = q.where(Booking.status == filter_status)

        count_q = select(func.count()).select_from(q.subquery())
        total = await self._db.scalar(count_q)

        items_q = q.order_by(Booking.start_at.desc()).offset((page - 1) * _PAGE_SIZE).limit(_PAGE_SIZE)
        items = list((await self._db.execute(items_q)).scalars().all())

        return PaginatedBookings(
            items=[BookingResponse.model_validate(b) for b in items],
            total=total or 0,
            page=page,
            page_size=_PAGE_SIZE,
            has_next=len(items) == _PAGE_SIZE,
        )

    async def get_for_user(self, user: User, booking_id: uuid.UUID) -> Booking:
        booking = await self._db.scalar(select(Booking).where(Booking.id == booking_id))
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        provider_profile_id: uuid.UUID | None = None
        if user.role == UserRole.PROVIDER:
            from app.models.provider import ProviderProfile
            provider_profile_id = await self._db.scalar(
                select(ProviderProfile.id).where(ProviderProfile.user_id == user.id)
            )
        self._assert_participant(user, booking, provider_profile_id)
        return booking

    async def confirm(self, user: User, booking_id: uuid.UUID) -> Booking:
        if user.role != UserRole.PROVIDER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only providers can confirm bookings",
            )
        booking = await self.get_for_user(user, booking_id)
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not pending")
        await self._check_conflicts(booking.provider_id, booking.start_at, booking.end_at, booking.id)
        booking.status = BookingStatus.CONFIRMED
        await self._db.commit()
        await self._db.refresh(booking)
        from app.workers.tasks import send_booking_notification
        send_booking_notification.delay(str(booking.id), "CONFIRMED")
        if booking.rrule_string:
            from app.workers.tasks import expand_recurring_bookings
            expand_recurring_bookings.delay()
        return booking

    async def _check_conflicts(
        self,
        provider_id: uuid.UUID,
        start_at: datetime,
        end_at: datetime,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> None:
        """Raise 409 if the provider already has a confirmed booking overlapping this time range."""
        q = select(Booking).where(
            Booking.provider_id == provider_id,
            Booking.status == BookingStatus.CONFIRMED,
            Booking.start_at < end_at,
            Booking.end_at > start_at,
        )
        if exclude_booking_id:
            q = q.where(Booking.id != exclude_booking_id)
        if await self._db.scalar(q):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Provider has a conflicting confirmed booking",
            )

    async def cancel(self, user: User, booking_id: uuid.UUID) -> Booking:
        booking = await self.get_for_user(user, booking_id)
        if booking.status == BookingStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a completed booking")
        booking.status = BookingStatus.CANCELLED
        await self._db.commit()
        await self._db.refresh(booking)
        from app.workers.tasks import send_booking_notification
        send_booking_notification.delay(str(booking.id), "CANCELLED")
        return booking

    async def create_review(
        self, user: User, booking_id: uuid.UUID, body: ReviewCreateRequest
    ) -> Review:
        booking = await self.get_for_user(user, booking_id)
        if booking.status != BookingStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only review completed bookings")

        existing = await self._db.scalar(select(Review).where(Review.booking_id == booking_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reviewed")

        if not (1 <= body.rating <= 5):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rating must be 1–5")

        reviewee_id = booking.provider_id if user.id == booking.customer_id else booking.customer_id
        review = Review(
            booking_id=booking_id,
            reviewer_id=user.id,
            reviewee_id=reviewee_id,
            rating=body.rating,
            body=body.body,
        )
        self._db.add(review)
        await self._db.commit()
        await self._db.refresh(review)
        return review

    @staticmethod
    def _assert_participant(
        user: User,
        booking: Booking,
        provider_profile_id: uuid.UUID | None = None,
    ) -> None:
        if user.role == UserRole.ADMIN:
            return
        if booking.customer_id == user.id:
            return
        if provider_profile_id and booking.provider_id == provider_profile_id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
