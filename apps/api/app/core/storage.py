# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""
Object storage abstraction layer.

Two-phase upload flow:
  1. Client calls POST /uploads/presign → receives (upload_url, public_url, key).
  2. Client PUTs the file directly to `upload_url` (no server proxy).
  3. Client persists `public_url` on the user/profile record.

The current implementation uses an S3-compatible backend. Credentials point at
Cloudflare R2 in the current environment, but callers do not depend on the
underlying provider.

Performance note: the boto3 client is constructed once at module import time
(_storage_client_singleton) and reused for every request. generate_presigned_url
is CPU-only (HMAC-SHA256 signing — no network I/O), so there is nothing to pool;
the cost being avoided is the 2–5 ms of credential loading and endpoint-resolver
construction that boto3.client() performs on each instantiation.
"""
import abc
import uuid
from urllib.parse import urlsplit

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
_storage_client_singleton = boto3.client(
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


def _build_public_base_url() -> str:
    explicit_public_base = settings.spaces_public_base_url.strip().rstrip("/")
    if explicit_public_base:
        return explicit_public_base

    endpoint = settings.spaces_endpoint.strip().rstrip("/")
    if not endpoint:
        return ""

    parsed = urlsplit(endpoint)
    if parsed.netloc.endswith(".r2.cloudflarestorage.com"):
        # R2 public reads should use a custom domain or r2.dev URL. Fall back to
        # a path-style URL only if no explicit public base has been configured.
        return f"{endpoint}/{settings.spaces_bucket}"

    return endpoint.replace("://", f"://{settings.spaces_bucket}.")


_storage_public_base = _build_public_base_url()


class SpacesStorageRepository(AbstractStorageRepository):
    """S3-compatible object storage implementation backed by a shared boto3 client."""

    def __init__(self) -> None:
        self._client = _storage_client_singleton
        self._bucket = settings.spaces_bucket
        self._public_base = _storage_public_base

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
            },
            ExpiresIn=expires_in,
            HttpMethod="PUT",
        )
        public_url = f"{self._public_base}/{key}"
        return presigned_url, public_url


def get_storage() -> AbstractStorageRepository:
    """FastAPI dependency that returns the configured storage repository."""
    return SpacesStorageRepository()
