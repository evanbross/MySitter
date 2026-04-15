"""
AuthService: registration, password login, passkey (WebAuthn) flows, TOTP setup.

Passkey flow overview:
  Registration:
    1. Client calls GET /auth/passkey/registration-options
    2. Server generates a challenge, stores it in Redis keyed to the user session
    3. Client calls navigator.credentials.create() with the options
    4. Client POSTs the credential to POST /auth/passkey/register
    5. Server verifies via py_webauthn and stores PasskeyCredential

  Authentication:
    1. Client calls POST /auth/passkey/auth-options with email
    2. Server returns challenge + list of allowed credential IDs
    3. Client calls navigator.credentials.get()
    4. Client POSTs the assertion to POST /auth/passkey/authenticate
    5. Server verifies, updates sign_count, issues tokens
"""
import uuid
from typing import TYPE_CHECKING

import pyotp
import redis.asyncio as aioredis
import stripe
from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.workers.tasks import send_welcome_email
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.provider import ProviderProfile
from app.models.user import PasskeyCredential, User, UserRole
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    TotpSetupResponse,
)

if TYPE_CHECKING:
    pass

_REFRESH_COOKIE = "refresh_token"
_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
_CHALLENGE_TTL = 300  # 5 minutes


def _reg_challenge_key(user_id: uuid.UUID) -> str:
    return f"passkey:reg_challenge:{user_id}"


def _auth_challenge_key(user_id: uuid.UUID) -> str:
    return f"passkey:auth_challenge:{user_id}"


class AuthService:
    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        self._db = db
        self._redis = redis

    # ─── Registration ─────────────────────────────────────────────────────────

    async def register(self, body: RegisterRequest) -> TokenResponse:
        existing = await self._db.scalar(select(User).where(User.email == body.email))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        try:
            role = UserRole(body.role.upper())
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

        user = User(
            email=body.email,
            display_name=body.display_name,
            phone=body.phone,
            password_hash=hash_password(body.password),
            role=role,
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)

        if user.role == UserRole.PROVIDER:
            stripe_customer_id: str | None = None
            if settings.stripe_secret_key:
                stripe.api_key = settings.stripe_secret_key
                customer = stripe.Customer.create(
                    email=user.email,
                    name=user.display_name,
                    metadata={"user_id": str(user.id)},
                )
                stripe_customer_id = customer["id"]

            profile = ProviderProfile(
                user_id=user.id,
                stripe_customer_id=stripe_customer_id,
                services=[],
                service_radius_miles=10,
                is_active=False,
            )
            self._db.add(profile)
            await self._db.commit()

        send_welcome_email.delay(str(user.id))
        return TokenResponse(access_token=create_access_token(user.id))

    # ─── Password Login ───────────────────────────────────────────────────────

    async def login(self, body: LoginRequest, response: Response) -> TokenResponse:
        user = await self._db.scalar(select(User).where(User.email == body.email))
        if not user or not user.password_hash:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")

        if user.totp_enabled:
            if not body.totp_code:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="TOTP code required",
                )
            if not pyotp.TOTP(user.totp_secret).verify(body.totp_code, valid_window=1):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

        self._set_refresh_cookie(response, create_refresh_token(user.id))
        return TokenResponse(access_token=create_access_token(user.id))

    # ─── Token Refresh ────────────────────────────────────────────────────────

    async def refresh(self, request: Request) -> TokenResponse:
        from jose import JWTError

        token = request.cookies.get(_REFRESH_COOKIE)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

        try:
            payload = decode_token(token)
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
            user_id = payload["sub"]
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = await self._db.get(User, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        return TokenResponse(access_token=create_access_token(user.id))

    # ─── Passkeys ─────────────────────────────────────────────────────────────

    async def get_passkey_registration_options(self, user: User) -> dict:
        """Generate WebAuthn credential creation options and cache the challenge in Redis."""
        import webauthn  # type: ignore[import-untyped]
        from webauthn.helpers.structs import (  # type: ignore[import-untyped]
            AuthenticatorSelectionCriteria,
            ResidentKeyRequirement,
            UserVerificationRequirement,
        )

        existing_creds = await self._db.scalars(
            select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)
        )
        exclude_credentials = [
            webauthn.helpers.structs.PublicKeyCredentialDescriptor(id=c.credential_id)
            for c in existing_creds
        ]

        options = webauthn.generate_registration_options(
            rp_id=settings.webauthn_rp_id,
            rp_name=settings.webauthn_rp_name,
            user_id=str(user.id).encode(),
            user_name=user.email,
            user_display_name=user.display_name,
            exclude_credentials=exclude_credentials,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.REQUIRED,
            ),
        )
        await self._redis.set(_reg_challenge_key(user.id), options.challenge, ex=_CHALLENGE_TTL)
        return webauthn.helpers.options_to_json(options)

    async def verify_passkey_registration(self, user: User, credential_json: dict) -> dict:
        """Retrieve the stored challenge, verify the WebAuthn registration, and persist the credential."""
        import webauthn

        challenge = await self._redis.getdel(_reg_challenge_key(user.id))
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration challenge expired or not found — restart the registration flow",
            )

        verification = webauthn.verify_registration_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
        )

        cred = PasskeyCredential(
            user_id=user.id,
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            device_type=str(verification.credential_device_type),
        )
        self._db.add(cred)
        await self._db.commit()
        return {"verified": True}

    async def get_passkey_auth_options(self, email: str) -> dict:
        """Generate WebAuthn authentication options and cache the challenge in Redis."""
        import webauthn
        from webauthn.helpers.structs import UserVerificationRequirement

        user = await self._db.scalar(select(User).where(User.email == email))
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        creds = list(
            await self._db.scalars(
                select(PasskeyCredential).where(PasskeyCredential.user_id == user.id)
            )
        )
        allow_credentials = [
            webauthn.helpers.structs.PublicKeyCredentialDescriptor(id=c.credential_id)
            for c in creds
        ]

        options = webauthn.generate_authentication_options(
            rp_id=settings.webauthn_rp_id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        await self._redis.set(_auth_challenge_key(user.id), options.challenge, ex=_CHALLENGE_TTL)
        return webauthn.helpers.options_to_json(options)

    async def verify_passkey_auth(self, credential_json: dict, response: Response) -> TokenResponse:
        """
        Look up the credential by ID, retrieve the stored challenge, verify the
        WebAuthn assertion, update the sign count, and issue tokens.
        """
        import base64

        import webauthn

        # credential_json["id"] is base64url-encoded; pad and decode to bytes.
        raw_id = base64.urlsafe_b64decode(credential_json["id"] + "==")

        cred = await self._db.scalar(
            select(PasskeyCredential).where(PasskeyCredential.credential_id == raw_id)
        )
        if not cred:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown credential")

        challenge = await self._redis.getdel(_auth_challenge_key(cred.user_id))
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Auth challenge expired or not found — restart the login flow",
            )

        verification = webauthn.verify_authentication_response(
            credential=credential_json,
            expected_challenge=challenge,
            expected_rp_id=settings.webauthn_rp_id,
            expected_origin=settings.webauthn_origin,
            credential_public_key=cred.public_key,
            credential_current_sign_count=cred.sign_count,
        )

        cred.sign_count = verification.new_sign_count
        await self._db.commit()

        user = await self._db.get(User, cred.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account inactive")

        self._set_refresh_cookie(response, create_refresh_token(user.id))
        return TokenResponse(access_token=create_access_token(user.id))

    # ─── TOTP ─────────────────────────────────────────────────────────────────

    async def setup_totp(self, user: User) -> TotpSetupResponse:
        secret = pyotp.random_base32()
        user.totp_secret = secret
        await self._db.commit()

        totp = pyotp.TOTP(secret)
        qr_url = totp.provisioning_uri(name=user.email, issuer_name=settings.app_name)
        return TotpSetupResponse(secret=secret, qr_code_url=qr_url)

    async def enable_totp(self, user: User, code: str) -> dict:
        if not user.totp_secret:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="TOTP not set up")
        if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code")
        user.totp_enabled = True
        await self._db.commit()
        return {"verified": True}

    # ─── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _set_refresh_cookie(response: Response, token: str) -> None:
        response.set_cookie(
            key=_REFRESH_COOKIE,
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=_COOKIE_MAX_AGE,
        )
