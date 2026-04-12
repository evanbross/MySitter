import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GeoPointSchema(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ProviderProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    bio: str | None
    services: list[str]
    hourly_rate: float | None
    service_radius_miles: int
    is_active: bool
    subscription_tier: str | None
    rating: float | None
    review_count: int
    # location is serialized separately as GeoPoint
    location: GeoPointSchema | None = None

    model_config = {"from_attributes": True}


class ProviderSearchResult(ProviderProfileResponse):
    distance_miles: float
    display_name: str
    avatar_url: str | None


class ProviderProfileUpdateRequest(BaseModel):
    bio: str | None = None
    services: list[str] | None = None
    hourly_rate: float | None = None
    service_radius_miles: int | None = None
    location: GeoPointSchema | None = None


class AvailabilityResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    rrule_string: str | None

    model_config = {"from_attributes": True}


class PaginatedProviderSearch(BaseModel):
    items: list[ProviderSearchResult]
    total: int
    page: int
    page_size: int
    has_next: bool


class AvailabilityCreateRequest(BaseModel):
    start_at: datetime
    end_at: datetime
    rrule_string: str | None = None


class AvailabilityUpdateRequest(BaseModel):
    start_at: datetime | None = None
    end_at: datetime | None = None
    rrule_string: str | None = None
