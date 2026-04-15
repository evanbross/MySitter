from pydantic import BaseModel, Field


class UploadUrlRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., pattern=r"^image/(jpeg|png|webp|gif)$")


class UploadUrlResponse(BaseModel):
    upload_url: str   # Presigned PUT URL — client uploads directly here
    public_url: str   # Permanent public URL to save after the upload succeeds
    key: str          # Storage key, for reference


class PhotoAddRequest(BaseModel):
    """Body for POST /providers/me/photos after a successful client-side upload."""
    url: str = Field(..., min_length=1, max_length=500)
