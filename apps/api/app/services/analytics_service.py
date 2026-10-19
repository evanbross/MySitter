# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.provider import ProviderProfile
from app.schemas.analytics import ProviderAnalytics, WeeklyBookingCount


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_provider_analytics(
        self, provider_profile_id: uuid.UUID
    ) -> ProviderAnalytics:
        # 1. Total/completed bookings and unique customers for all time
        stats_result = await self._db.execute(
            select(
                func.count(Booking.id).label("total_bookings"),
                func.count(Booking.id).filter(Booking.status == BookingStatus.COMPLETED).label("completed_bookings"),
                func.count(distinct(Booking.customer_id)).label("unique_customers"),
            ).where(Booking.provider_id == provider_profile_id)
        )
        stats = stats_result.one()
        total_bookings = stats.total_bookings or 0
        completed_bookings = stats.completed_bookings or 0
        unique_customers = stats.unique_customers or 0

        completion_rate = (
            completed_bookings / total_bookings if total_bookings > 0 else 0.0
        )

        # 2. Rating and review count from provider profile
        profile = await self._db.get(ProviderProfile, provider_profile_id)
        avg_rating = profile.rating if profile and profile.rating is not None else 0.0
        review_count = profile.review_count if profile else 0

        # 3. Weekly trend for the past 12 weeks
        now = datetime.now(timezone.utc)
        twelve_weeks_ago = now - timedelta(weeks=12)
        trend_result = await self._db.execute(
            select(
                func.date_trunc("week", Booking.start_at).label("week_start"),
                func.count(Booking.id).label("count"),
                func.count(Booking.id).filter(Booking.status == BookingStatus.COMPLETED).label("completed"),
            )
            .where(
                Booking.provider_id == provider_profile_id,
                Booking.start_at >= twelve_weeks_ago,
            )
            .group_by(func.date_trunc("week", Booking.start_at))
            .order_by("week_start")
        )

        weekly_trend = []
        for row in trend_result.all():
            weekly_trend.append(
                WeeklyBookingCount(
                    week_start=row.week_start.date() if isinstance(row.week_start, datetime) else row.week_start,
                    count=row.count,
                    completed=row.completed,
                )
            )

        # Fill in missing weeks with 0
        filled_trend = []
        current_week_start = (now - timedelta(days=now.weekday())).date()
        for i in range(11, -1, -1):
            week_date = current_week_start - timedelta(weeks=i)
            existing = next((w for w in weekly_trend if w.week_start == week_date), None)
            if existing:
                filled_trend.append(existing)
            else:
                filled_trend.append(WeeklyBookingCount(week_start=week_date, count=0, completed=0))

        return ProviderAnalytics(
            total_bookings=total_bookings,
            completed_bookings=completed_bookings,
            completion_rate=completion_rate,
            unique_customers=unique_customers,
            avg_rating=float(avg_rating),
            review_count=review_count,
            weekly_trend=filled_trend,
        )
