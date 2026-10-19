# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, MappedColumn

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Read replica: falls back to the write engine when READ_REPLICA_URL is not configured,
# making single-region deployments work without any code changes.
_read_url = settings.read_replica_url or settings.database_url
_read_engine = create_async_engine(
    _read_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncReadSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    _read_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# Re-export for convenience so models only need to import from here.
__all__ = ["Base", "engine", "AsyncSessionLocal", "AsyncReadSessionLocal", "MappedColumn"]
