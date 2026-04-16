"""Integration tests for booking creation and state machine transitions."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_booking_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/bookings", json={})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_bookings_empty(client: AsyncClient, customer_token: str) -> None:
    resp = await client.get(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["items"] == []


@pytest.mark.asyncio
async def test_provider_cannot_create_booking(
    client: AsyncClient, provider_token: str
) -> None:
    """Providers are not allowed to create bookings — only customers can."""
    resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={
            "provider_id": "00000000-0000-0000-0000-000000000001",
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    assert resp.status_code == 403
