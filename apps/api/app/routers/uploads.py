"""
Upload router — presigned URL generation for client-side direct uploads.

Flow:
  POST /uploads/presign  →  { upload_url, public_url, key }
  Client PUTs file bytes to upload_url (directly to storage, no proxy)
  Client POSTs public_url to POST /providers/me/photos to persist it
"""
import uuid

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.core.storage import AbstractStorageRepository, get_storage
from app.models.user import User
from app.schemas.uploads import UploadUrlRequest, UploadUrlResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presign", response_model=UploadUrlResponse, status_code=201)
async def presign_upload(
    body: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
    storage: AbstractStorageRepository = Depends(get_storage),
) -> UploadUrlResponse:
    """
    Return a short-lived presigned PUT URL.

    The client must:
      1. PUT the file to `upload_url` with the matching Content-Type header.
      2. After a 200 response from storage, POST `public_url` to
         /providers/me/photos to attach it to their profile.
    """
    ext = body.filename.rsplit(".", 1)[-1] if "." in body.filename else "bin"
    key = f"uploads/{current_user.id}/{uuid.uuid4()}.{ext}"

    upload_url, public_url = storage.generate_presigned_put(
        key=key,
        content_type=body.content_type,
    )
    return UploadUrlResponse(upload_url=upload_url, public_url=public_url, key=key)
