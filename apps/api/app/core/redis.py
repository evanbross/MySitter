# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""Async Redis client and FastAPI dependency."""
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis

from app.core.config import settings

# Shared connection pool — created once at import time, reused across requests.
# decode_responses=False because we store raw bytes (WebAuthn challenges).
_pool = aioredis.ConnectionPool.from_url(
    settings.redis_url,
    max_connections=20,
    decode_responses=False,
)


def get_redis_client() -> aioredis.Redis:
    """Return a Redis client backed by the shared connection pool."""
    return aioredis.Redis(connection_pool=_pool)


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency: yield a Redis client, close on teardown."""
    client = get_redis_client()
    try:
        yield client
    finally:
        await client.aclose()
