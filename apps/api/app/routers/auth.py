"""
Auth router: registration, login (password + TOTP), passkey flows, token refresh/logout.
Full passkey implementation requires integrating py_webauthn — stubs are provided here
to wire the routes; implementation goes in app/services/auth_service.py.
"""
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, get_redis
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PasskeyAuthOptionsRequest,
    RegisterRequest,
    TokenResponse,
    TotpSetupResponse,
    TotpVerifyRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """Register a new user with email + password. Returns tokens immediately."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).register(body)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """Password login with optional TOTP code. Sets httpOnly refresh token cookie."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).login(body, response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """Issue a new access token using the httpOnly refresh token cookie."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).refresh(request)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear the refresh token cookie."""
    response.delete_cookie("refresh_token")


# ─── Passkeys ─────────────────────────────────────────────────────────────────

@router.get("/passkey/registration-options")
async def passkey_registration_options(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Return WebAuthn PublicKeyCredentialCreationOptions for registering a passkey."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).get_passkey_registration_options(current_user)


@router.post("/passkey/register")
async def passkey_register(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Verify and store a newly registered passkey credential."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).verify_passkey_registration(current_user, body)


@router.post("/passkey/auth-options")
async def passkey_auth_options(
    body: PasskeyAuthOptionsRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Return WebAuthn PublicKeyCredentialRequestOptions for authenticating with a passkey."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).get_passkey_auth_options(body.email)


@router.post("/passkey/authenticate", response_model=TokenResponse)
async def passkey_authenticate(
    body: dict,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TokenResponse:
    """Verify a passkey assertion and issue tokens."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).verify_passkey_auth(body, response)


# ─── TOTP ─────────────────────────────────────────────────────────────────────

@router.post("/totp/setup", response_model=TotpSetupResponse)
async def totp_setup(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> TotpSetupResponse:
    """Generate a TOTP secret and QR code URL for the current user."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).setup_totp(current_user)


@router.post("/totp/verify")
@limiter.limit("10/minute")
async def totp_verify(
    request: Request,
    body: TotpVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Verify the TOTP code and enable TOTP on the account."""
    from app.services.auth_service import AuthService
    return await AuthService(db, redis).enable_totp(current_user, body.code)
