"""
Passkey (WebAuthn) round-trip tests.

Because WebAuthn credential creation and assertion are browser-side operations,
we cannot replay them in a unit/integration test without a real authenticator.
Instead, we:
  1. Drive the server-side flows via HTTP (registration-options, auth-options)
     so that challenges are generated and stored in FakeAsyncRedis.
  2. Patch `webauthn.verify_registration_response` and
     `webauthn.verify_authentication_response` to return pre-built result objects,
     bypassing the cryptographic check while keeping all DB/Redis logic real.

This gives us confidence that the service wiring (challenge lifecycle, credential
persistence, token issuance) is correct, without needing a virtual authenticator.
"""
import base64
import uuid
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

# A stable fake credential ID for this test module (22 bytes → 30-char base64url)
_FAKE_CRED_ID: bytes = b"fake-passkey-cred-id!!"
_FAKE_CRED_ID_B64: str = base64.urlsafe_b64encode(_FAKE_CRED_ID).decode().rstrip("=")

# Minimal fake credential JSON bodies — contents don't matter because webauthn
# verification is mocked; the shapes just need to satisfy `dict` body parsing.
_REGISTER_BODY: dict = {
    "id": _FAKE_CRED_ID_B64,
    "rawId": _FAKE_CRED_ID_B64,
    "response": {"clientDataJSON": "e30", "attestationObject": "e30"},
    "type": "public-key",
}

_AUTH_BODY: dict = {
    "id": _FAKE_CRED_ID_B64,
    "rawId": _FAKE_CRED_ID_B64,
    "response": {
        "clientDataJSON": "e30",
        "authenticatorData": "e30",
        "signature": "e30",
    },
    "type": "public-key",
}


def _make_registration_result() -> MagicMock:
    result = MagicMock()
    result.credential_id = _FAKE_CRED_ID
    result.credential_public_key = b"fake-public-key-bytes"
    result.sign_count = 0
    result.credential_device_type = "single_device"
    return result


def _make_auth_result() -> MagicMock:
    result = MagicMock()
    result.new_sign_count = 1
    return result


# ─── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
async def registered_user(client: AsyncClient) -> dict:
    """Register a fresh user and return {email, password, access_token}."""
    email = f"passkey_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": "Passkey User", "role": "CUSTOMER"},
    )
    assert resp.status_code == 201
    return {"email": email, "password": password, "access_token": resp.json()["access_token"]}


# ─── tests ────────────────────────────────────────────────────────────────────

async def test_passkey_registration_round_trip(client: AsyncClient, registered_user: dict) -> None:
    """
    Full registration flow:
      GET  /auth/passkey/registration-options  →  challenge stored in Redis
      POST /auth/passkey/register              →  credential persisted in DB
    """
    token = registered_user["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Step 1: fetch registration options — this stores the challenge in FakeAsyncRedis
    options_resp = await client.get("/auth/passkey/registration-options", headers=auth_headers)
    assert options_resp.status_code == 200
    options = options_resp.json()
    assert "challenge" in options

    # Step 2: submit a fake credential; bypass crypto with a mocked verification result
    with patch("webauthn.verify_registration_response", return_value=_make_registration_result()):
        register_resp = await client.post(
            "/auth/passkey/register", json=_REGISTER_BODY, headers=auth_headers
        )

    assert register_resp.status_code == 200
    assert register_resp.json() == {"verified": True}


async def test_passkey_auth_round_trip(client: AsyncClient, registered_user: dict) -> None:
    """
    Full authentication flow (requires a credential already registered):
      POST /auth/passkey/auth-options    →  challenge stored in Redis
      POST /auth/passkey/authenticate    →  tokens issued
    """
    token = registered_user["access_token"]
    email = registered_user["email"]

    # Register a passkey first so the credential exists in the DB
    with patch("webauthn.verify_registration_response", return_value=_make_registration_result()):
        reg_resp = await client.post(
            "/auth/passkey/register",
            json=_REGISTER_BODY,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert reg_resp.status_code == 200

    # Step 1: fetch auth options — stores the challenge keyed by user_id in FakeAsyncRedis
    auth_options_resp = await client.post(
        "/auth/passkey/auth-options", json={"email": email}
    )
    assert auth_options_resp.status_code == 200
    assert "challenge" in auth_options_resp.json()

    # Step 2: authenticate with the fake credential
    with patch("webauthn.verify_authentication_response", return_value=_make_auth_result()):
        auth_resp = await client.post("/auth/passkey/authenticate", json=_AUTH_BODY)

    assert auth_resp.status_code == 200
    body = auth_resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert "refresh_token" in auth_resp.cookies


async def test_passkey_auth_fails_without_registered_credential(client: AsyncClient) -> None:
    """
    Authenticating with an unknown credential ID should return 401,
    without reaching the webauthn verification step.
    """
    unknown_id = base64.urlsafe_b64encode(b"unknown-credential-xyz").decode().rstrip("=")
    resp = await client.post(
        "/auth/passkey/authenticate",
        json={**_AUTH_BODY, "id": unknown_id, "rawId": unknown_id},
    )
    assert resp.status_code == 401


async def test_passkey_auth_fails_with_expired_challenge(
    client: AsyncClient, registered_user: dict
) -> None:
    """
    If auth-options was never called (no challenge in Redis), the authenticate
    endpoint must reject the request rather than proceeding with a missing challenge.
    """
    token = registered_user["access_token"]

    # Register the credential so DB lookup succeeds
    with patch("webauthn.verify_registration_response", return_value=_make_registration_result()):
        await client.post(
            "/auth/passkey/register",
            json=_REGISTER_BODY,
            headers={"Authorization": f"Bearer {token}"},
        )

    # Skip calling auth-options — no challenge is stored → should get 400
    with patch("webauthn.verify_authentication_response", return_value=_make_auth_result()):
        resp = await client.post("/auth/passkey/authenticate", json=_AUTH_BODY)

    assert resp.status_code == 400
