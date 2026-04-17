"""Integration tests for the messaging endpoints."""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_start_conversation_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/conversations", json={"provider_id": "some-id"})
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_start_conversation(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    resp = await client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"provider_id": provider_id},
    )
    assert resp.status_code == 201
    assert "id" in resp.json()

@pytest.mark.asyncio
async def test_send_message(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    conv_resp = await client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"provider_id": provider_id},
    )
    conversation_id = conv_resp.json()["id"]

    msg_resp = await client.post(
        f"/conversations/{conversation_id}/messages",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"body": "Hello, world!"},
    )
    assert msg_resp.status_code == 201
    assert msg_resp.json()["body"] == "Hello, world!"

@pytest.mark.asyncio
async def test_list_conversations_empty(client: AsyncClient, customer_token: str) -> None:
    resp = await client.get("/conversations", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_mark_read(client: AsyncClient, customer_token: str, provider_user: dict) -> None:
    provider_id = provider_user["user"]["provider_profile"]["id"]
    conv_resp = await client.post(
        "/conversations",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"provider_id": provider_id},
    )
    conversation_id = conv_resp.json()["id"]
    
    await client.post(
        f"/conversations/{conversation_id}/messages",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"body": "A message"},
    )

    read_resp = await client.patch(
        f"/conversations/{conversation_id}/read",
        headers={"Authorization": f"Bearer {provider_user['access_token']}"},
    )
    assert read_resp.status_code == 200
