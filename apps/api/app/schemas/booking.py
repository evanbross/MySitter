import uuid
from datetime import datetime

from pydantic import BaseModel


class BookingCreateRequest(BaseModel):
    provider_id: uuid.UUID
    service_type: str
    start_at: datetime
    end_at: datetime
    rrule_string: str | None = None
    notes: str | None = None


class BookingResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    provider_id: uuid.UUID
    status: str
    service_type: str
    start_at: datetime
    end_at: datetime
    rrule_string: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewCreateRequest(BaseModel):
    rating: int
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


class PaginatedBookings(BaseModel):
    items: list[BookingResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
