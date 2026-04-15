import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    phone: str | None
    display_name: str
    avatar_url: str | None
    role: str
    is_active: bool
    totp_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None
