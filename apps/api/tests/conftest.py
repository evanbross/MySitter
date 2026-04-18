"""
Shared fixtures for the MySitter API test suite.

Uses an in-memory SQLite database for speed — not PostGIS-compatible, but
sufficient for unit/integration tests that don't use geographic queries.
For geo-query tests, override the `db_url` fixture to point at a test
Postgres instance.
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User


_DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
_CONNECT_ARGS = {"check_same_thread": False} if _DB_URL.startswith("sqlite") else {}


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(
        _DB_URL,
        connect_args=_CONNECT_ARGS,
        poolclass=StaticPool if _DB_URL.startswith("sqlite") else None,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db(db_engine):
    async with AsyncSession(db_engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db):
    """
    ASGI test client with the real FastAPI app wired to the test database.
    The `get_db` dependency is overridden so all routes use the test session.
    """
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def provider_user(client: AsyncClient) -> dict:
    """Register a provider, then fetch their ProviderProfile, and return a combined dict."""
    resp = await client.post("/auth/register", json={
        "email": "provider@test.com",
        "password": "Test1234!",
        "display_name": "Test Provider",
        "role": "PROVIDER",
    })
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]

    profile_resp = await client.get(
        "/providers/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 200, profile_resp.text

    return {
        "access_token": token,
        "user": {
            "provider_profile": profile_resp.json(),
        },
    }


@pytest_asyncio.fixture
async def provider_token(provider_user: dict) -> str:
    """Return the access token from the provider_user fixture."""
    return provider_user["access_token"]


@pytest_asyncio.fixture
async def customer_token(client: AsyncClient) -> str:
    """Register a customer and return its access token."""
    resp = await client.post("/auth/register", json={
        "email": "customer@test.com",
        "password": "Test1234!",
        "display_name": "Test Customer",
        "role": "CUSTOMER",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]
