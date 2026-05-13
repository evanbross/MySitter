from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_API_ROOT = Path(__file__).resolve().parents[2]  # apps/api/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_API_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ─── App ──────────────────────────────────────────────────────────────────
    app_name: str = "mysitter API"
    app_url: str = "https://mysitter.com"
    web_base_url: str = "http://localhost:5173"
    debug: bool = False
    secret_key: str
    sentry_dsn: str | None = None
    environment: str = "development"

    # ─── Database ─────────────────────────────────────────────────────────────
    database_url: str          # postgresql+asyncpg:// for async SQLAlchemy
    database_sync_url: str     # postgresql:// for Alembic migrations

    # ─── Redis ────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ─── JWT ──────────────────────────────────────────────────────────────────
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # ─── WebAuthn (Passkeys) ──────────────────────────────────────────────────
    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "mysitter"
    webauthn_origin: str = "http://localhost:5173"

    # ─── Stripe ───────────────────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_basic: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_premium: str = ""

    # ─── Twilio ───────────────────────────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # ─── Email (SMTP via ForwardEmail) ────────────────────────────────────────
    smtp_host: str = "smtp.forwardemail.net"
    smtp_port: int = 587
    smtp_username: str = ""   # sending address (e.g. noreply@mysitter.com)
    smtp_password: str = ""   # ForwardEmail API key
    email_from: str = "noreply@mysitter.com"

    # ─── Mapbox ───────────────────────────────────────────────────────────────
    mapbox_secret_token: str = ""

    # ─── Object Storage ───────────────────────────────────────────────────────
    spaces_endpoint: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_R2_ENDPOINT", "SPACES_ENDPOINT"),
    )
    spaces_key: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_R2_DATA_RW_ACCESS_KEY", "SPACES_KEY"),
    )
    spaces_secret: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_R2_DATA_RW_SECRET", "SPACES_SECRET"),
    )
    spaces_bucket: str = Field(
        default="mysitter",
        validation_alias=AliasChoices("CLOUDFLARE_R2_SITTER_BUCKET", "SPACES_BUCKET"),
    )
    spaces_region: str = Field(
        default="auto",
        validation_alias=AliasChoices("CLOUDFLARE_R2_REGION", "SPACES_REGION"),
    )
    spaces_public_base_url: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_R2_PUBLIC_BASE_URL", "SPACES_PUBLIC_BASE_URL"),
    )
    spaces_account_id: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_R2_ACCOUNT_ID"),
    )
    spaces_admin_token: str = Field(default="", alias="CLOUDFLARE_R2_ADMIN_TOKEN")
    spaces_admin_access_key: str = Field(default="", alias="CLOUDFLARE_R2_ADMIN_ACCESS_KEY")
    spaces_admin_secret: str = Field(default="", alias="CLOUDFLARE_R2_ADMIN_SECRET")
    spaces_admin_jurisdiction_endpoint: str = Field(
        default="",
        validation_alias=AliasChoices(
            "CLOUDFLARE_R2_ADMIN_JURISIDICTION_ENDPOINT",
            "CLOUDFLARE_R2_ADMIN_JURISDICTION_ENDPOINT",
        ),
    )
    spaces_data_rw_token: str = Field(default="", alias="CLOUDFLARE_R2_DATA_RW_TOKEN")

    # ─── Multi-region ─────────────────────────────────────────────────────────
    read_replica_url: str = ""   # postgresql+asyncpg:// for read replica; falls back to database_url if empty
    region: str = "nyc3"         # informational — "nyc3" | "ams3" | "sgp1" etc.


settings = Settings()  # type: ignore[call-arg]
