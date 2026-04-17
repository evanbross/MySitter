import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.provider import ProviderProfile
from app.models.review import Review
from app.models.user import User
from app.schemas.review import PaginatedReviews, ReviewCreateRequest, ReviewResponse


class ReviewService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self, user: User, booking_id: uuid.UUID, body: ReviewCreateRequest
    ) -> Review:
        booking = await self._db.get(Booking, booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking.status != BookingStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only review completed bookings",
            )

        if user.id != booking.customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only customers can leave reviews",
            )

        provider_profile = await self._db.get(ProviderProfile, booking.provider_id)
        if provider_profile is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

        reviewee_id = provider_profile.user_id

        existing = await self._db.scalar(
            select(Review).where(
                Review.booking_id == booking_id,
                Review.reviewer_id == user.id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already reviewed this booking",
            )

        review = Review(
            booking_id=booking_id,
            reviewer_id=user.id,
            reviewee_id=reviewee_id,
            rating=body.rating,
            body=body.body,
        )
        self._db.add(review)
        await self._db.flush()
        await self._recalculate_provider_rating(booking.provider_id)
        await self._db.commit()
        await self._db.refresh(review)
        return review

    async def get_my_review(
        self, user: User, booking_id: uuid.UUID
    ) -> Review | None:
        return await self._db.scalar(
            select(Review).where(
                Review.booking_id == booking_id,
                Review.reviewer_id == user.id,
            )
        )

    async def list_for_provider(
        self, provider_profile_id: uuid.UUID, page: int = 1, page_size: int = 20
    ) -> PaginatedReviews:
        # Only surface customer→provider reviews publicly.
        base_q = (
            select(Review)
            .join(Booking, Review.booking_id == Booking.id)
            .where(Booking.provider_id == provider_profile_id)
            .where(Review.reviewer_id == Booking.customer_id)
        )
        total: int = await self._db.scalar(
            select(func.count()).select_from(base_q.subquery())
        ) or 0
        rows = list(
            (
                await self._db.execute(
                    base_q.order_by(Review.created_at.desc())
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
            ).scalars()
        )
        return PaginatedReviews(
            items=[ReviewResponse.model_validate(r) for r in rows],
            total=total,
            page=page,
            page_size=page_size,
            has_next=len(rows) == page_size,
        )

    async def _recalculate_provider_rating(
        self, provider_profile_id: uuid.UUID
    ) -> None:
        result = await self._db.execute(
            select(func.avg(Review.rating), func.count(Review.id))
            .join(Booking, Review.booking_id == Booking.id)
            .where(Booking.provider_id == provider_profile_id)
            .where(Review.reviewer_id == Booking.customer_id)
        )
        avg_rating, count = result.one()
        profile = await self._db.get(ProviderProfile, provider_profile_id)
        if profile is not None:
            profile.rating = round(float(avg_rating), 2) if avg_rating is not None else None
            profile.review_count = count or 0
