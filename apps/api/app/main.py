from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import (
    admin,
    analytics,
    auth,
    billing,
    bookings,
    customer_profiles,
    messages,
    providers,
    referrals,
    reviews,
    seo,
    uploads,
    users,
    websocket,
)

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration(), CeleryIntegration()],
        traces_sample_rate=0.2,
        environment=settings.environment,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run startup/shutdown logic. Add DB connection checks here if needed."""
    app.state.limiter = limiter
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# In production, lock this down to your actual frontend domain(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", settings.webauthn_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(providers.router)
app.include_router(bookings.router)
app.include_router(billing.router)
app.include_router(messages.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(websocket.router)
app.include_router(analytics.router)
app.include_router(seo.router)
app.include_router(uploads.router)
app.include_router(referrals.router)
app.include_router(customer_profiles.router)


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}
