"""Integration tests for the analytics endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.provider import ProviderProfile

@pytest.mark.asyncio
async def test_analytics_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/analytics/me")
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_analytics_customer_rejected(client: AsyncClient, customer_token: str) -> None:
    resp = await client.get("/analytics/me", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_analytics_basic_tier_rejected(client: AsyncClient, provider_token: str) -> None:
    resp = await client.get("/analytics/me", headers={"Authorization": f"Bearer {provider_token}"})
    assert resp.status_code == 402

@pytest.mark.asyncio
async def test_analytics_pro_returns_structure(client: AsyncClient, provider_user: dict, db: AsyncSession) -> None:
    # Manually upgrade the provider's tier to PRO for this test
    profile_id = provider_user["user"]["provider_profile"]["id"]
    profile = await db.get(ProviderProfile, profile_id)
    profile.subscription_tier = "PRO"
    await db.commit()

    resp = await client.get("/analytics/me", headers={"Authorization": f"Bearer {provider_user['access_token']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_bookings" in data
    assert "completion_rate" in data
    assert "unique_customers" in data
    assert "avg_rating" in data
    assert "review_count" in data
