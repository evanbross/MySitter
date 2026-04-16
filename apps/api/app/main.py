from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin, auth, billing, bookings, messages, providers, referrals, reviews, seo, uploads, users, websocket, analytics


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run startup/shutdown logic. Add DB connection checks here if needed."""
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

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


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
