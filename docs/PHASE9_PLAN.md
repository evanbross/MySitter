# Phase 9 — Mobile Provider Calendar, CI/CD, Production Deployment

**Scope:** Three infrastructure and UX gaps that block launch readiness:
1. Providers cannot manage availability on mobile — the calendar tab is missing.
2. Tests exist (Phase 8) but run only manually — no CI pipeline.
3. The dev `docker-compose.yml` is not suitable for production — no production config exists.

**Gemini pass order:** Pass A = Steps 1 + 2. Pass B = Step 3.

---

## Gemini Rules (carry these into every prompt)

These rules exist because Gemini has introduced these bugs repeatedly. Enforce them strictly.

| # | Rule |
|---|---|
| 1 | **`enabled` guard on conditional queries** — any `useQuery` whose result is only valid for a specific role or auth state must have `enabled: user?.role === "X"` or `enabled: !!user`. Never call unconditionally. |
| 2 | **QueryClientProvider placement** — never call `useQuery`-based hooks in the same component that provides `QueryClientProvider`. Hooks run before `return`, so the context doesn't exist yet. Split into an outer provider component and an inner consumer component. |
| 3 | **StrictMode double-invoke guard** — any `useEffect` that calls a mutating API (POST/PATCH/DELETE) must be guarded with a `useRef(false)` flag set before the call. React 18 StrictMode double-invokes effects in development. |
| 4 | **Use shared types from `@mysitter/types`** — never redeclare inline object types for API payloads. Always import the canonical type. |
| 5 | **Verify mobile export names** — mobile imports must be checked against the actual source file. Do not copy export names from memory or from the web app — they often differ (`API_BASE` on mobile vs `API_URL` on web). |
| 6 | **Object params, not positional** — `apiClient.reviews.listForProvider(id, { page, page_size })` not `listForProvider(id, 1, 10)`. Always match the TypeScript signature. |
| 7 | **SQLAlchemy 2.x count pattern** — `select(func.count()).select_from(q.subquery())`. Never `.with_only_columns(func.count())`. |
| 8 | **No bare `pass` in stubs** — always `raise NotImplementedError("not yet implemented")`. |
| 9 | **No `__import__()`** — top-of-file imports only. |
| 10 | **No dead branches** — no `if False:`, `if True:`, commented-out alternatives, or unreachable arms. |
| 11 | **Never import from `app.main` in routers** — `main.py` imports all routers, so any router that imports back from `main.py` creates a circular import that crashes startup. Shared infrastructure (limiters, app state, etc.) belongs in `app/core/`, not `app/main.py`. |
| 12 | **Never access model attributes that aren't in the model definition** — before referencing `obj.some_field` on a SQLAlchemy model, confirm the field exists as a `Mapped` column or relationship in the model class. Do not invent convenience fields that would be useful but aren't defined. |
| 13 | **Test fixtures must match the actual endpoint response schema** — before writing a fixture that reads a field from a response (e.g. `resp.json()["user"]["provider_profile"]["id"]`), verify that field exists in the Pydantic `response_model` the endpoint declares. Do not assume nested data is present without checking the schema. |
| 14 | **Follow the file layout in the plan exactly** — do not create additional directories, duplicate config files, or parallel implementations beyond what the plan specifies. If the plan says `docker-compose.prod.yml` at the repo root, create exactly that file — not also a `deploy/docker-compose.prod.yml`. Extra files that reference each other inconsistently introduce bugs and ambiguity about which config is authoritative. |

---

## Step 1 — Mobile Provider Calendar

**Goal:** Give providers a native screen to view, add, and delete their availability blocks on iOS/Android. This mirrors what the web CalendarPage already does, but adapted for mobile — no FullCalendar (it's a web library), using a simple list + time-picker UI instead.

### What already exists

| Layer | Status |
|---|---|
| Backend `GET /{provider_id}/availability` | ✓ Done |
| Backend `POST /providers/me/availability` | ✓ Done |
| Backend `DELETE /providers/me/availability/{id}` | ✓ Done |
| `apiClient.providers.getAvailability(providerId)` | ✓ Done |
| `apiClient.providers.createAvailability(data)` | ✓ Done |
| `apiClient.providers.deleteAvailability(id)` | ✓ Done |
| `Availability` type in `@mysitter/types` | Verify before using |
| Web `CalendarPage.tsx` | ✓ Done (FullCalendar — web only) |

### New file: `apps/mobile/app/(tabs)/calendar.tsx`

This tab renders only for providers. Customers land on a redirect to the bookings tab (their booking timeline is the functional equivalent of a calendar).

```tsx
// apps/mobile/app/(tabs)/calendar.tsx

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import type { Availability, AvailabilityCreate } from "@mysitter/types";
import { useAuth } from "../../hooks/useAuth";
import {
  useMyProviderProfile,
  useProviderAvailability,
  useCreateAvailability,
  useDeleteAvailability,
} from "../../hooks/useProviders";
```

**Component structure:**

1. `CalendarTab` (default export) — role gate: if not PROVIDER, show a brief message and a link to Bookings. If PROVIDER, render `ProviderCalendarScreen`.

2. `ProviderCalendarScreen` — fetches `profile` (to get `profile.id`) then fetches `availability`. Renders a `FlatList` of `AvailabilityRow` items plus an "Add block" button at the top.

3. `AvailabilityRow` — shows start/end times formatted as `"Mon Jun 1, 10:00 AM – 12:00 PM"`, with a red trash icon `Pressable` that calls `deleteAvailability.mutateAsync(block.id)` after an `Alert.alert` confirmation.

4. `AddBlockModal` — a `Modal` (or inline expandable form) with:
   - Start: `DateTimePicker` (mode="datetime")
   - End: `DateTimePicker` (mode="datetime")
   - Recurrence: `TextInput` placeholder `"FREQ=WEEKLY;BYDAY=MO,WE,FR (optional)"`
   - "Save" button that calls `createAvailability.mutateAsync({ start_at, end_at, rrule_string })`

**Implementation notes:**

- Use `@react-native-community/datetimepicker` for the date/time pickers. Verify it is in `apps/mobile/package.json` before using it — add it if missing.
- Convert `Date` objects to ISO strings before sending to the API: `date.toISOString()`.
- The `useMyProviderProfile` hook takes a boolean `isProvider` parameter (verify the exact signature in the web hook file before copying it). On mobile, call it with the provider guard from `useAuth()`.
- Format dates for display using `Intl.DateTimeFormat` or a simple helper — do not import a date library that isn't already in the project.
- All imports must be relative paths — no `@/` alias on mobile.
- After `createAvailability` or `deleteAvailability` succeeds, `invalidateQueries` is already handled inside the hook's `onSuccess` — do not add a second manual refetch call.

**Error states:**

- If `useProviderAvailability` returns an error, show: `"Could not load your schedule. Pull down to retry."`
- If `createAvailability` fails, show the error message inline below the form (not a toast — keep it simple).
- If `deleteAvailability` fails, show `Alert.alert("Delete failed", error.message)`.

---

### Update `apps/mobile/app/(tabs)/_layout.tsx`

Add the calendar tab to the tab bar. It should be visible only for providers — use `display: user?.role === "PROVIDER" ? "flex" : "none"` on the `Tabs.Screen` options, which hides the tab without unmounting it (safe for Expo Router).

```tsx
<Tabs.Screen
  name="calendar"
  options={{
    title: "Calendar",
    tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
    href: user?.role === "PROVIDER" ? undefined : null, // null = hidden from tab bar
  }}
/>
```

> **Note:** In Expo Router v3+, setting `href: null` on a `Tabs.Screen` hides the tab from the tab bar while keeping the route accessible. This is the correct approach — do not use `display: none` on the tab bar icon as it leaves an empty slot.

---

### Verify mobile hooks: `apps/mobile/hooks/useProviders.ts`

Before writing the calendar screen, check whether `useMyProviderProfile`, `useProviderAvailability`, `useCreateAvailability`, and `useDeleteAvailability` already exist in `apps/mobile/hooks/useProviders.ts`. If they do, use them as-is. If `useProviders.ts` is missing or incomplete, add only the hooks needed for this step:

```typescript
// useProviderAvailability — fetch a provider's availability blocks
export function useProviderAvailability(providerId: string | undefined) {
  return useQuery<Availability[]>({
    queryKey: ["availability", providerId],
    queryFn: () => apiClient.providers.getAvailability(providerId!),
    enabled: !!providerId,
  });
}

// useCreateAvailability — POST a new availability block
export function useCreateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AvailabilityCreate) =>
      apiClient.providers.createAvailability(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

// useDeleteAvailability — DELETE an availability block
export function useDeleteAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (availabilityId: string) =>
      apiClient.providers.deleteAvailability(availabilityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}
```

---

## Step 2 — CI/CD Pipeline (GitLab CI)

**Goal:** Run the backend test suite automatically on every push and merge request. The tests were written in Phase 8 but are never run by any automation today.

### What already exists

- `apps/api/tests/` — full test suite (auth, bookings, analytics, referrals, messaging)
- `apps/api/requirements-dev.txt` — pytest, httpx, pytest-asyncio
- `apps/api/.venv` — local virtual environment
- `turbo.json` — build graph (verify the `test` task is defined)

### New file: `.gitlab-ci.yml`

Place this at the repository root.

```yaml
default:
  image: python:3.13-slim

stages:
  - test

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.pip-cache"
  DATABASE_URL: "postgresql+asyncpg://mysitter:mysitter@postgres/mysitter_test"
  SECRET_KEY: "ci-test-secret-key-not-for-production"
  REDIS_URL: "redis://redis:6379/0"
  RESEND_API_KEY: ""
  STRIPE_SECRET_KEY: ""
  TWILIO_ACCOUNT_SID: ""
  TWILIO_AUTH_TOKEN: ""

cache:
  paths:
    - .pip-cache/

api-tests:
  stage: test
  services:
    - name: postgis/postgis:16-3.4
      alias: postgres
      variables:
        POSTGRES_USER: mysitter
        POSTGRES_PASSWORD: mysitter
        POSTGRES_DB: mysitter_test
    - name: redis:7-alpine
      alias: redis
  before_script:
    - apt-get update -qq && apt-get install -y -qq libpq-dev gcc gdal-bin
    - pip install virtualenv
    - virtualenv apps/api/.venv
    - apps/api/.venv/bin/pip install --upgrade pip
    - apps/api/.venv/bin/pip install -r apps/api/requirements.txt -r apps/api/requirements-dev.txt
  script:
    - apps/api/.venv/bin/alembic -c apps/api/alembic.ini upgrade head
    - apps/api/.venv/bin/pytest apps/api/tests --tb=short -q
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_COMMIT_BRANCH == "develop"'
```

**Why PostGIS in CI:** The `ProviderProfile` model uses GeoAlchemy2 `Geography` columns. SQLite cannot handle these. The CI pipeline must use a real PostgreSQL + PostGIS service to run migrations and tests that touch provider profiles.

**Why `libpq-dev gcc gdal-bin` in `before_script`:** The base `python:3.13-slim` image has no system libraries. `libpq-dev` + `gcc` are required to compile asyncpg; `gdal-bin` is required by GeoAlchemy2.

**Why blank external service keys:** The tests never reach email/SMS/push code paths in their current form. Setting keys to empty strings prevents SDK initializers from crashing while ensuring no real charges fire in CI.

**GitLab service DNS:** GitLab CI services are reachable by their `alias`. The Postgres service alias is `postgres`, so the host in `DATABASE_URL` is `postgres` (not `localhost`). Same for `redis`.

### Update `apps/api/tests/conftest.py` for PostgreSQL CI

The current `conftest.py` uses SQLite (`sqlite+aiosqlite:///:memory:`). This works for tests that don't touch the geography columns, but migrations and provider-profile tests will fail on SQLite.

Update `conftest.py` to use the `DATABASE_URL` environment variable when set, falling back to SQLite for local runs without Postgres:

```python
import os
from sqlalchemy.ext.asyncio import create_async_engine

_DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
_CONNECT_ARGS = {"check_same_thread": False} if _DB_URL.startswith("sqlite") else {}

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(
        _DB_URL,
        connect_args=_CONNECT_ARGS,
        poolclass=StaticPool if _DB_URL.startswith("sqlite") else None,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
```

> **Note:** `StaticPool` must only be passed for SQLite — `AsyncAdaptedQueuePool` is the default for Postgres. Passing `poolclass=None` lets SQLAlchemy choose the default.

### Update `apps/api/package.json` test script

Verify the `"test"` script in `apps/api/package.json` invokes pytest correctly. On Linux/macOS CI it should be:

```json
"test": ".venv/bin/python -m pytest"
```

On Windows local it uses `.venv/Scripts/python`. The CI runs on Linux so the script above is correct for the pipeline — Windows developers can run `python -m pytest` directly with their venv activated.

---

## Step 3 — Production Deployment Configuration

**Goal:** Produce the configuration files needed to deploy to production — a hardened API Dockerfile, a production Compose file, and an environment variable template. The app will run on a DigitalOcean Droplet (per `docs/SERVICES_AND_COSTS.md`) with a managed PostgreSQL + Redis, behind an nginx reverse proxy.

### New file: `apps/api/Dockerfile`

```dockerfile
FROM python:3.13-slim AS base

WORKDIR /app

# Install system deps for psycopg2/asyncpg and GeoAlchemy2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc gdal-bin && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps first (cacheable layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**Notes:**
- `libpq-dev` + `gcc` are required for asyncpg to compile.
- `gdal-bin` is required by GeoAlchemy2 for PostGIS geometry operations.
- `--workers 2` is appropriate for a 2 vCPU Droplet; adjust for the actual machine.
- Do not `COPY requirements-dev.txt` or install dev dependencies in the production image.

### New file: `docker-compose.prod.yml`

```yaml
version: "3.9"

services:
  api:
    build:
      context: apps/api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env.production
    ports:
      - "8000:8000"
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build:
      context: apps/api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env.production
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
    depends_on:
      - redis

  beat:
    build:
      context: apps/api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env.production
    command: celery -A app.workers.celery_app beat --loglevel=info
    depends_on:
      - redis

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - api

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

**Why no Postgres service here:** Production uses DigitalOcean Managed PostgreSQL (per `docs/SERVICES_AND_COSTS.md`). The DATABASE_URL in `.env.production` points at the managed cluster. Only Redis runs locally in Compose.

### New file: `.env.production.example`

```bash
# Database — DigitalOcean Managed PostgreSQL connection string
DATABASE_URL=postgresql+asyncpg://user:password@host:25060/mysitter?ssl=require

# Synchronous DB URL for Celery tasks (uses psycopg2 driver)
DATABASE_SYNC_URL=postgresql+psycopg2://user:password@host:25060/mysitter?sslmode=require

# Redis — DigitalOcean Managed Redis or local container
REDIS_URL=redis://localhost:6379/0

# JWT signing secret — generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=REPLACE_WITH_RANDOM_64_CHAR_HEX

# Resend transactional email
RESEND_API_KEY=re_XXXXXX
EMAIL_FROM=noreply@mysitter.app

# Stripe
STRIPE_SECRET_KEY=sk_live_XXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXX

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=ACXXXXXX
TWILIO_AUTH_TOKEN=XXXXXX
TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# DigitalOcean Spaces (file uploads)
SPACES_KEY=XXXXXX
SPACES_SECRET=XXXXXX
SPACES_BUCKET=mysitter-uploads
SPACES_REGION=nyc3

# App URLs
WEB_BASE_URL=https://mysitter.app
API_BASE_URL=https://api.mysitter.app

# Mapbox (public token — safe in frontend .env, included here for server-side geo if needed)
MAPBOX_TOKEN=pk.XXXXXX
```

### New file: `nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:8000;
    }

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name api.mysitter.app;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name api.mysitter.app;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # WebSocket support (for /ws/* routes)
        location /ws/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            client_max_body_size 20M;
        }
    }
}
```

**TLS certificates:** The `nginx/certs/` directory is gitignored. In production, either:
- Use Certbot to generate Let's Encrypt certs and mount them into the container, or
- Terminate TLS at the DigitalOcean load balancer and run nginx in plain HTTP mode inside the private network.

Add `nginx/certs/` to `.gitignore`.

### Health check endpoint

The nginx and Compose healthcheck configs call `GET /health`. Verify this endpoint exists in `apps/api/app/main.py`. If missing, add it:

```python
@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

This route is intentionally not included in the OpenAPI schema (`include_in_schema=False`) since it's infrastructure, not API surface.

---

## Files Modified / Created

| File | Change |
|---|---|
| `apps/mobile/app/(tabs)/calendar.tsx` | New — provider availability management on mobile |
| `apps/mobile/app/(tabs)/_layout.tsx` | Add calendar tab (hidden for non-providers) |
| `apps/mobile/hooks/useProviders.ts` | Add availability hooks if missing |
| `.gitlab-ci.yml` | New — GitLab CI pipeline |
| `apps/api/tests/conftest.py` | Support `DATABASE_URL` env var for Postgres in CI |
| `apps/api/package.json` | Verify pytest test script |
| `apps/api/Dockerfile` | New — production image |
| `docker-compose.prod.yml` | New — production service orchestration |
| `.env.production.example` | New — environment variable template |
| `nginx/nginx.conf` | New — TLS + WebSocket reverse proxy config |
| `apps/api/app/main.py` | Add `/health` endpoint if missing |