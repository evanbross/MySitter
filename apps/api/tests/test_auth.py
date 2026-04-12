"""
Auth contract tests — covers registration, password login, token refresh, and logout.

Each test uses a unique email address so rows never conflict across tests
(the schema is created once per session, not rolled back between tests).
"""
import pytest
from httpx import AsyncClient

# ─── helpers ──────────────────────────────────────────────────────────────────

async def _register(
    client: AsyncClient,
    email: str,
    password: str = "Passw0rd!",
    role: str = "CUSTOMER",
) -> dict:
    resp = await client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": "Test User", "role": role},
    )
    return resp


async def _login(client: AsyncClient, email: str, password: str = "Passw0rd!") -> dict:
    return await client.post("/auth/login", json={"email": email, "password": password})


# ─── registration ─────────────────────────────────────────────────────────────

async def test_register_returns_access_token(client: AsyncClient) -> None:
    resp = await _register(client, "reg_happy@example.com")
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


async def test_register_duplicate_email_is_409(client: AsyncClient) -> None:
    await _register(client, "reg_dup@example.com")
    resp = await _register(client, "reg_dup@example.com")
    assert resp.status_code == 409


# ─── login ────────────────────────────────────────────────────────────────────

async def test_login_returns_token_and_sets_cookie(client: AsyncClient) -> None:
    email = "login_ok@example.com"
    await _register(client, email)
    resp = await _login(client, email)
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert "refresh_token" in resp.cookies


async def test_login_wrong_password_is_401(client: AsyncClient) -> None:
    email = "login_bad_pw@example.com"
    await _register(client, email)
    resp = await _login(client, email, password="wrong!")
    assert resp.status_code == 401


async def test_login_unknown_email_is_401(client: AsyncClient) -> None:
    resp = await _login(client, "nobody@example.com")
    assert resp.status_code == 401


# ─── /users/me ────────────────────────────────────────────────────────────────

async def test_get_me_with_valid_token(client: AsyncClient) -> None:
    email = "me_ok@example.com"
    token = (await _register(client, email)).json()["access_token"]
    resp = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == email


async def test_get_me_no_token_is_403(client: AsyncClient) -> None:
    # HTTPBearer(auto_error=True) returns 403 when the header is absent entirely
    resp = await client.get("/users/me")
    assert resp.status_code == 403


async def test_get_me_invalid_token_is_401(client: AsyncClient) -> None:
    resp = await client.get("/users/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert resp.status_code == 401


# ─── refresh ──────────────────────────────────────────────────────────────────

async def test_refresh_with_valid_cookie(client: AsyncClient) -> None:
    email = "refresh_ok@example.com"
    await _register(client, email)
    await _login(client, email)  # sets refresh_token cookie on `client`
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_without_cookie_is_401(client: AsyncClient) -> None:
    # Fresh client — no login, no cookie
    resp = await client.post("/auth/refresh")
    assert resp.status_code == 401


# ─── logout ───────────────────────────────────────────────────────────────────

async def test_logout_clears_cookie(client: AsyncClient) -> None:
    email = "logout@example.com"
    await _register(client, email)
    await _login(client, email)
    assert "refresh_token" in client.cookies

    resp = await client.post("/auth/logout")
    assert resp.status_code == 204
    # Cookie should be expired/cleared — the Set-Cookie header signals deletion
    set_cookie = resp.headers.get("set-cookie", "")
    assert "refresh_token" in set_cookie
    assert "max-age=0" in set_cookie.lower() or "expires" in set_cookie.lower()
