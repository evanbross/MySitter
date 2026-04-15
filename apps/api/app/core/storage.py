"""
Object storage abstraction layer.

Two-phase upload flow:
  1. Client calls POST /uploads/presign → receives (upload_url, public_url, key).
  2. Client PUTs the file directly to `upload_url` (no server proxy).
  3. Client calls POST /providers/me/photos with `public_url` to persist it.

SpacesStorageRepository targets DigitalOcean Spaces (S3-compatible).
Swap by providing a different AbstractStorageRepository implementation and
wiring it into get_storage() — callers are unaware of the underlying provider.

Performance note: the boto3 client is constructed once at module import time
(_spaces_client_singleton) and reused for every request. generate_presigned_url
is CPU-only (HMAC-SHA256 signing — no network I/O), so there is nothing to pool;
the cost being avoided is the 2–5 ms of credential loading and endpoint-resolver
construction that boto3.client() performs on each instantiation.
"""
import abc
import uuid

import boto3
from botocore.config import Config

from app.core.config import settings


class AbstractStorageRepository(abc.ABC):
    """Repository abstraction for object storage operations."""

    @abc.abstractmethod
    def generate_presigned_put(
        self,
        key: str,
        content_type: str,
        expires_in: int = 300,
    ) -> tuple[str, str]:
        """
        Return (presigned_put_url, public_url) for the given storage key.

        Args:
            key:          Object path inside the bucket (e.g. "uploads/user_id/file.jpg").
            content_type: MIME type the client will use in the PUT Content-Type header.
            expires_in:   Presigned URL TTL in seconds (default 5 minutes).

        Returns:
            Tuple of (presigned PUT URL, permanent public URL).
        """
        raise NotImplementedError("not yet implemented")


# ── Singleton boto3 client ─────────────────────────────────────────────────────
# Created once at module import; shared across all requests in the process.
# boto3's synchronous client is safe to share across coroutines because
# generate_presigned_url holds no I/O state — it only reads immutable config.
# If you later add actual S3 I/O operations (upload, download), switch to
# aioboto3 with an async session instead.
_spaces_client_singleton = boto3.client(
    "s3",
    region_name=settings.spaces_region,
    endpoint_url=settings.spaces_endpoint,
    aws_access_key_id=settings.spaces_key,
    aws_secret_access_key=settings.spaces_secret,
    config=Config(
        signature_version="s3v4",
        # botocore's internal urllib3 pool — only relevant if you ever make
        # real S3 requests through this client rather than just presigning.
        max_pool_connections=10,
    ),
)

_spaces_public_base = settings.spaces_endpoint.replace(
    "://", f"://{settings.spaces_bucket}."
)


class SpacesStorageRepository(AbstractStorageRepository):
    """DigitalOcean Spaces (S3-compatible) implementation backed by a shared boto3 client."""

    def __init__(self) -> None:
        self._client = _spaces_client_singleton
        self._bucket = settings.spaces_bucket
        self._public_base = _spaces_public_base

    def generate_presigned_put(
        self,
        key: str,
        content_type: str,
        expires_in: int = 300,
    ) -> tuple[str, str]:
        presigned_url: str = self._client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self._bucket,
                "Key": key,
                "ContentType": content_type,
                "ACL": "public-read",
            },
            ExpiresIn=expires_in,
            HttpMethod="PUT",
        )
        public_url = f"{self._public_base}/{key}"
        return presigned_url, public_url


def get_storage() -> AbstractStorageRepository:
    """FastAPI dependency that returns the configured storage repository."""
    return SpacesStorageRepository()
