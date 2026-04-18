from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ─── App ──────────────────────────────────────────────────────────────────
    app_name: str = "mysitter API"
    app_url: str = "https://mysitter.com"
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

    # ─── Resend ───────────────────────────────────────────────────────────────
    resend_api_key: str = ""
    email_from: str = "noreply@mysitter.com"

    # ─── Mapbox ───────────────────────────────────────────────────────────────
    mapbox_secret_token: str = ""

    # ─── Object Storage ───────────────────────────────────────────────────────
    spaces_endpoint: str = ""
    spaces_key: str = ""
    spaces_secret: str = ""
    spaces_bucket: str = "mysitter"
    spaces_region: str = "nyc3"

    # ─── Multi-region ─────────────────────────────────────────────────────────
    read_replica_url: str = ""   # postgresql+asyncpg:// for read replica; falls back to database_url if empty
    region: str = "nyc3"         # informational — "nyc3" | "ams3" | "sgp1" etc.


settings = Settings()  # type: ignore[call-arg]
