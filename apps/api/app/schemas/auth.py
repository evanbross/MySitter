# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    phone: str | None = None
    role: str = "CUSTOMER"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasskeyAuthOptionsRequest(BaseModel):
    email: EmailStr


class TotpVerifyRequest(BaseModel):
    code: str


class TotpSetupResponse(BaseModel):
    secret: str
    qr_code_url: str


class RefreshRequest(BaseModel):
    """Body is unused — refresh token comes from httpOnly cookie."""
    pass


class PasswordResetRequestBody(BaseModel):
    email: EmailStr


class PasswordResetConfirmBody(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
