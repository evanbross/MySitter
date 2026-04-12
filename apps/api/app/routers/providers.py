"""
Provider router: search, profile management, availability.
Geographic search uses PostGIS ST_DWithin via raw SQL in the service layer.
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_role
from app.models.user import User, UserRole
from app.schemas.provider import (
    AvailabilityCreateRequest,
    AvailabilityResponse,
    AvailabilityUpdateRequest,
    PaginatedProviderSearch,
    ProviderProfileResponse,
    ProviderProfileUpdateRequest,
)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/search", response_model=PaginatedProviderSearch)
async def search_providers(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_miles: int = Query(10, ge=1, le=100),
    service_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> PaginatedProviderSearch:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).search(lat, lng, radius_miles, service_type, page)


@router.get("/me", response_model=ProviderProfileResponse)
async def get_my_profile(
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileResponse:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).get_by_user_id(current_user.id)


@router.patch("/me", response_model=ProviderProfileResponse)
async def update_my_profile(
    body: ProviderProfileUpdateRequest,
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileResponse:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).update_profile(current_user.id, body)


@router.get("/{provider_id}", response_model=ProviderProfileResponse)
async def get_provider_profile(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileResponse:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).get_by_id(provider_id)


@router.get("/{provider_id}/availability", response_model=list[AvailabilityResponse])
async def get_availability(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[AvailabilityResponse]:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).get_availability(provider_id)


@router.post("/me/availability", response_model=AvailabilityResponse, status_code=201)
async def create_availability(
    body: AvailabilityCreateRequest,
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> AvailabilityResponse:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).create_availability(current_user.id, body)


@router.patch("/me/availability/{availability_id}", response_model=AvailabilityResponse)
async def update_my_availability(
    availability_id: uuid.UUID,
    body: AvailabilityUpdateRequest,
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> AvailabilityResponse:
    from app.services.provider_service import ProviderService
    return await ProviderService(db).update_availability(current_user.id, availability_id, body)


@router.delete("/me/availability/{availability_id}", status_code=204)
async def delete_availability(
    availability_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.PROVIDER)),
    db: AsyncSession = Depends(get_db),
) -> None:
    from app.services.provider_service import ProviderService
    await ProviderService(db).delete_availability(current_user.id, availability_id)
