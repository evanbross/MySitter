from pydantic import BaseModel, EmailStr


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
