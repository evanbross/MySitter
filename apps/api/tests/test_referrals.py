# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""Integration tests for the referral endpoints."""
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_generate_referral_code(client: AsyncClient, customer_token: str) -> None:
    resp = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 201
    assert "code" in resp.json()
    assert isinstance(resp.json()["code"], str)

@pytest.mark.asyncio
async def test_generate_idempotent(client: AsyncClient, customer_token: str) -> None:
    resp1 = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {customer_token}"})
    code1 = resp1.json()["code"]
    resp2 = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {customer_token}"})
    code2 = resp2.json()["code"]
    assert code1 == code2

@pytest.mark.asyncio
async def test_claim_valid_code(client: AsyncClient, provider_token: str) -> None:
    # User A (provider) generates a code
    gen_resp = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {provider_token}"})
    code = gen_resp.json()["code"]

    # User B (a new customer) claims it
    user_b_resp = await client.post("/auth/register", json={"email": "user_b@test.com", "password": "p", "display_name": "d", "role": "CUSTOMER"})
    user_b_token = user_b_resp.json()["access_token"]
    
    claim_resp = await client.post(f"/referrals/claim/{code}", headers={"Authorization": f"Bearer {user_b_token}"})
    assert claim_resp.status_code == 200

@pytest.mark.asyncio
async def test_claim_own_code_rejected(client: AsyncClient, customer_token: str) -> None:
    gen_resp = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {customer_token}"})
    code = gen_resp.json()["code"]
    
    claim_resp = await client.post(f"/referrals/claim/{code}", headers={"Authorization": f"Bearer {customer_token}"})
    assert claim_resp.status_code == 400

@pytest.mark.asyncio
async def test_claim_already_used_code(client: AsyncClient, provider_token: str) -> None:
    gen_resp = await client.post("/referrals/generate", headers={"Authorization": f"Bearer {provider_token}"})
    code = gen_resp.json()["code"]

    user_b_resp = await client.post("/auth/register", json={"email": "user_b@test.com", "password": "p", "display_name": "d", "role": "CUSTOMER"})
    user_b_token = user_b_resp.json()["access_token"]
    await client.post(f"/referrals/claim/{code}", headers={"Authorization": f"Bearer {user_b_token}"})

    user_c_resp = await client.post("/auth/register", json={"email": "user_c@test.com", "password": "p", "display_name": "d", "role": "CUSTOMER"})
    user_c_token = user_c_resp.json()["access_token"]
    
    claim_resp_2 = await client.post(f"/referrals/claim/{code}", headers={"Authorization": f"Bearer {user_c_token}"})
    assert claim_resp_2.status_code == 409
