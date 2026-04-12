"""
ProviderService: profile CRUD and geographic search via PostGIS.
"""
import uuid

from fastapi import HTTPException, status
from geoalchemy2.functions import ST_DWithin, ST_MakePoint
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider import Availability, ProviderProfile
from app.models.user import User
from app.schemas.provider import (
    AvailabilityCreateRequest,
    AvailabilityResponse,
    AvailabilityUpdateRequest,
    PaginatedProviderSearch,
    ProviderProfileResponse,
    ProviderProfileUpdateRequest,
    ProviderSearchResult,
)

_MILES_TO_METERS = 1609.344


class ProviderService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def search(
        self,
        lat: float,
        lng: float,
        radius_miles: int,
        service_type: str | None,
        page: int,
    ) -> PaginatedProviderSearch:
        radius_m = radius_miles * _MILES_TO_METERS
        point_wkt = f"SRID=4326;POINT({lng} {lat})"

        base_q = (
            select(
                ProviderProfile,
                User.display_name,
                User.avatar_url,
                func.ST_Distance(
                    ProviderProfile.location,
                    func.ST_GeogFromText(point_wkt),
                ).label("dist_m"),
            )
            .join(User, User.id == ProviderProfile.user_id)
            .where(ProviderProfile.is_active.is_(True))
            .where(
                ST_DWithin(
                    ProviderProfile.location,
                    func.ST_GeogFromText(point_wkt),
                    radius_m,
                )
            )
        )

        if service_type:
            base_q = base_q.where(ProviderProfile.services.contains([service_type]))

        count_q = select(func.count()).select_from(base_q.subquery())
        total = await self._db.scalar(count_q)

        rows_q = base_q.order_by("dist_m").offset((page - 1) * 20).limit(20)
        rows = (await self._db.execute(rows_q)).all()

        items = []
        for profile, display_name, avatar_url, dist_m in rows:
            item = ProviderSearchResult.model_validate(profile)
            item.display_name = display_name
            item.avatar_url = avatar_url
            item.distance_miles = round(dist_m / _MILES_TO_METERS, 2)
            items.append(item)

        return PaginatedProviderSearch(
            items=items,
            total=total or 0,
            page=page,
            page_size=20,
            has_next=len(items) == 20,
        )

    async def get_by_id(self, provider_id: uuid.UUID) -> ProviderProfile:
        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.id == provider_id)
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
        return profile

    async def get_by_user_id(self, user_id: uuid.UUID) -> ProviderProfile:
        profile = await self._db.scalar(
            select(ProviderProfile).where(ProviderProfile.user_id == user_id)
        )
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found")
        return profile

    async def update_profile(
        self, user_id: uuid.UUID, body: ProviderProfileUpdateRequest
    ) -> ProviderProfile:
        profile = await self.get_by_user_id(user_id)

        if body.bio is not None:
            profile.bio = body.bio
        if body.services is not None:
            profile.services = body.services
        if body.hourly_rate is not None:
            profile.hourly_rate = body.hourly_rate
        if body.service_radius_miles is not None:
            profile.service_radius_miles = body.service_radius_miles
        if body.location is not None:
            # Store as WKT point — GeoAlchemy2 accepts WKT strings
            profile.location = f"SRID=4326;POINT({body.location.lng} {body.location.lat})"

        await self._db.commit()
        await self._db.refresh(profile)
        return profile

    async def get_availability(self, provider_id: uuid.UUID) -> list[Availability]:
        result = await self._db.execute(
            select(Availability).where(Availability.provider_id == provider_id)
        )
        return list(result.scalars().all())

    async def create_availability(
        self, user_id: uuid.UUID, body: AvailabilityCreateRequest
    ) -> Availability:
        profile = await self.get_by_user_id(user_id)
        block = Availability(
            provider_id=profile.id,
            start_at=body.start_at,
            end_at=body.end_at,
            rrule_string=body.rrule_string,
        )
        self._db.add(block)
        await self._db.commit()
        await self._db.refresh(block)
        return block

    async def update_availability(
        self, user_id: uuid.UUID, availability_id: uuid.UUID, body: AvailabilityUpdateRequest
    ) -> Availability:
        profile = await self.get_by_user_id(user_id)
        block = await self._db.scalar(
            select(Availability).where(
                Availability.id == availability_id,
                Availability.provider_id == profile.id,
            )
        )
        if not block:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        if body.start_at is not None:
            block.start_at = body.start_at
        if body.end_at is not None:
            block.end_at = body.end_at
        if body.rrule_string is not None:
            block.rrule_string = body.rrule_string
        await self._db.commit()
        await self._db.refresh(block)
        return block

    async def delete_availability(
        self, user_id: uuid.UUID, availability_id: uuid.UUID
    ) -> None:
        profile = await self.get_by_user_id(user_id)
        block = await self._db.scalar(
            select(Availability).where(
                Availability.id == availability_id,
                Availability.provider_id == profile.id,
            )
        )
        if not block:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        await self._db.delete(block)
        await self._db.commit()
