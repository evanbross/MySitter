import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator
from app.core.config import settings

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

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if settings.spaces_endpoint and settings.spaces_bucket:
            allowed_prefix = settings.spaces_endpoint.replace(
                "://", f"://{settings.spaces_bucket}."
            )
            if not v.startswith(allowed_prefix):
                raise ValueError(
                    f"avatar_url must be a URL from the platform storage domain. "
                    f"Use POST /uploads/presign to obtain a valid upload URL."
                )
        return v
