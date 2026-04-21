# Local Development Setup

## How the pieces fit together

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Machine                                                   │
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  Browser        │     │  Android Phone  │                   │
│  │  localhost:5173 │     │  (Expo Go)      │                   │
│  └────────┬────────┘     └────────┬────────┘                   │
│           │ HTTP                  │ HTTP (same LAN)            │
│           ▼                       ▼                            │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │  Vite dev server│     │  Expo dev server│                   │
│  │  apps/web       │     │  apps/mobile    │                   │
│  │  :5173          │     │  :8081          │                   │
│  └─────────────────┘     └─────────────────┘                   │
│           │                       │                            │
│           └──────────┬────────────┘                            │
│                      │ HTTP REST / WebSocket                   │
│                      ▼                                         │
│           ┌─────────────────────┐                              │
│           │  FastAPI (uvicorn)  │                              │
│           │  apps/api           │                              │
│           │  :8000              │                              │
│           └──────────┬──────────┘                              │
│                      │                                         │
│   ┌──────────────────┼──────────────────────┐                  │
│   │  Docker          │                      │                  │
│   │  ┌───────────────▼───────┐  ┌────────┐  │                  │
│   │  │  PostgreSQL 16+PostGIS│  │ Redis  │  │                  │
│   │  │  host port: 5533      │  │  :6379 │  │                  │
│   │  │  container port: 5432 │  │        │  │                  │
│   │  │  volume: postgres_data│  │        │  │                  │
│   │  └───────────────────────┘  └────────┘  │                  │
│   │                                         │                  │
│   │  ┌──────────────┐  ┌─────────────────┐  │                  │
│   │  │ Celery worker│  │  MailHog        │  │                  │
│   │  │ (async tasks)│  │  SMTP:  1025    │  │                  │
│   │  └──────────────┘  │  Web UI: :8025  │  │                  │
│   │  ┌──────────────┐  └─────────────────┘  │                  │
│   │  │ Celery beat  │                        │                  │
│   │  │ (scheduler)  │                        │                  │
│   │  └──────────────┘                        │                  │
│   └─────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Starting everything

```bash
# 1. Infrastructure (Postgres, Redis, Celery, MailHog)
docker compose up

# 2. API (new terminal)
cd apps/api
.venv/Scripts/activate
uvicorn app.main:app --reload

# 3. Web frontend (new terminal)
cd apps/web
npm run dev

# 4. Mobile (new terminal, optional)
cd apps/mobile
npx expo start
```

## Useful URLs

| Service         | URL                        | Notes                        |
|-----------------|----------------------------|------------------------------|
| Web app         | http://localhost:5173      |                              |
| API docs        | http://localhost:8000/docs | Swagger UI                   |
| API redoc       | http://localhost:8000/redoc|                              |
| MailHog (email) | http://localhost:8025      | Captures all outbound email  |
| Postgres        | localhost:5533             | pgAdmin / DataGrip           |
| Redis           | localhost:6379             |                              |

## Database

Data lives in the `postgres_data` Docker named volume — completely separate from any
Postgres instance running locally on port 5432. Connect via pgAdmin or DataGrip using
the settings in the table above.

To apply schema migrations:
```bash
cd apps/api
.venv/Scripts/alembic upgrade head
```
