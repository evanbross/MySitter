"""Integration tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_customer(client: AsyncClient) -> None:
    resp = await client.post("/auth/register", json={
        "email": "newuser@test.com",
        "password": "Password1!",
        "display_name": "New User",
        "role": "CUSTOMER",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "CUSTOMER"


@pytest.mark.asyncio
async def test_login_returns_token(client: AsyncClient, customer_token: str) -> None:
    resp = await client.post("/auth/login", json={
        "email": "customer@test.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_user(client: AsyncClient, customer_token: str) -> None:
    resp = await client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "customer@test.com"
