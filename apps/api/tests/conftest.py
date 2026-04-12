"""
Shared pytest fixtures for the mysitter API test suite.

DB strategy: schema is created once per session using a sync engine (psycopg2),
then each test gets a fresh async session from the shared async engine. Tests use
unique emails so rows don't conflict; no rollback/truncate between tests.

Redis strategy: each test gets a FakeAsyncRedis instance, giving it an isolated
in-memory store with no side-effects between tests.
"""
from collections.abc import AsyncGenerator

import pytest
from fakeredis import FakeAsyncRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.core.deps import get_db
from app.core.redis import get_redis
from app.main import app

_ASYNC_DB_URL = "postgresql+asyncpg://mysitter:mysitter_dev@localhost:5432/mysitter_test"
_SYNC_DB_URL = "postgresql://mysitter:mysitter_dev@localhost:5432/mysitter_test"

# Engine is a module-level singleton — connection pool created once, reused across tests.
_engine = create_async_engine(_ASYNC_DB_URL, echo=False)
_SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    _engine, expire_on_commit=False, class_=AsyncSession
)


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    """
    Drop + recreate all tables on the test database once per session.
    Uses a sync engine so this runs outside any async event loop.
    The PostGIS extension is installed first because Geography columns require it.
    """
    sync_engine = create_engine(_SYNC_DB_URL)
    with sync_engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.drop_all(sync_engine)
    Base.metadata.create_all(sync_engine)
    yield
    Base.metadata.drop_all(sync_engine)
    sync_engine.dispose()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    ASGI test client with DB and Redis dependencies overridden.

    - DB: each request gets its own session from the shared async engine,
      exactly as production does (auth_service commits real rows).
    - Redis: isolated FakeAsyncRedis instance, reset between tests.
    """
    fake_redis = FakeAsyncRedis()

    async def _db_override() -> AsyncGenerator[AsyncSession, None]:
        async with _SessionLocal() as session:
            yield session

    async def _redis_override() -> AsyncGenerator[FakeAsyncRedis, None]:
        yield fake_redis

    app.dependency_overrides[get_db] = _db_override
    app.dependency_overrides[get_redis] = _redis_override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await fake_redis.aclose()
