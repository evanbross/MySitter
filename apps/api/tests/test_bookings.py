# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

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

@pytest.mark.asyncio
async def test_full_booking_lifecycle(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    
    # Customer creates booking
    create_resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    assert create_resp.status_code == 201
    booking = create_resp.json()
    assert booking["status"] == "PENDING"
    booking_id = booking["id"]

    # Provider confirms
    confirm_resp = await client.post(
        f"/bookings/{booking_id}/confirm",
        headers={"Authorization": f"Bearer {provider_user['access_token']}"},
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "CONFIRMED"

    # Provider completes
    complete_resp = await client.post(
        f"/bookings/{booking_id}/complete",
        headers={"Authorization": f"Bearer {provider_user['access_token']}"},
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "COMPLETED"

@pytest.mark.asyncio
async def test_create_booking_invalid_times(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T12:00:00Z",
            "end_at": "2026-06-01T10:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_confirm_requires_provider_role(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    create_resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    booking_id = create_resp.json()["id"]
    
    resp = await client.post(
        f"/bookings/{booking_id}/confirm",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_complete_requires_confirmed_status(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    create_resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    booking_id = create_resp.json()["id"]

    resp = await client.post(
        f"/bookings/{booking_id}/complete",
        headers={"Authorization": f"Bearer {provider_user['access_token']}"},
    )
    assert resp.status_code == 409

@pytest.mark.asyncio
async def test_cancel_completed_booking_rejected(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    create_resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    booking_id = create_resp.json()["id"]
    await client.post(f"/bookings/{booking_id}/confirm", headers={"Authorization": f"Bearer {provider_user['access_token']}"})
    await client.post(f"/bookings/{booking_id}/complete", headers={"Authorization": f"Bearer {provider_user['access_token']}"})

    resp = await client.post(
        f"/bookings/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 400

@pytest.mark.asyncio
async def test_get_booking_wrong_user_rejected(client: AsyncClient, provider_user: dict) -> None:
    # Create a booking between two other users
    other_customer_resp = await client.post("/auth/register", json={"email": "other@c.com", "password": "p", "display_name": "d", "role": "CUSTOMER"})
    other_customer_token = other_customer_resp.json()["access_token"]
    
    provider_id = provider_user["user"]["provider_profile"]["id"]
    create_resp = await client.post(
        "/bookings",
        headers={"Authorization": f"Bearer {other_customer_token}"},
        json={
            "provider_id": provider_id,
            "start_at": "2026-06-01T10:00:00Z",
            "end_at": "2026-06-01T12:00:00Z",
            "service_type": "DOG_WALKING",
        },
    )
    booking_id = create_resp.json()["id"]

    # A third user tries to fetch it
    third_user_resp = await client.post("/auth/register", json={"email": "third@c.com", "password": "p", "display_name": "d", "role": "CUSTOMER"})
    third_user_token = third_user_resp.json()["access_token"]
    
    resp = await client.get(
        f"/bookings/{booking_id}",
        headers={"Authorization": f"Bearer {third_user_token}"},
    )
    assert resp.status_code == 403
