# mysitter — Project Instructions

## What This Project Is

Pet and house sitting marketplace (similar to Rover). Providers list themselves with availability
calendars; customers search geographically and schedule one-time or recurring care sessions.
Passkey-first auth, in-app messaging, subscription billing, email/SMS/push notifications.

Full architecture: `docs/ARCHITECTURE.md`
Third-party services & costs: `docs/SERVICES_AND_COSTS.md`

## Monorepo Structure

```
apps/api/        FastAPI backend (Python)
apps/web/        React + Vite (customer & provider web UI)
apps/mobile/     Expo (React Native) — iOS & Android
apps/admin/      React Admin panel
packages/types/  Shared TypeScript types
packages/api-client/  Shared fetch + WebSocket wrapper
```

Run everything locally: `docker-compose up` (postgres + redis), then `npm run dev` from root.

## Best Practices

### Python (apps/api)
- Always use type hints on function signatures and class attributes
- Prefer OOP over procedural — use classes to encapsulate related state and behavior
- Follow PEP 8: `snake_case` functions/variables, `PascalCase` classes, `UPPER_CASE` constants
- Use SQLAlchemy 2.x `Mapped`/`mapped_column` style throughout — never legacy Column() style
- Business logic lives in `services/`, not in routers
- Validate at boundaries (routers/schemas); trust internal code
- Async throughout: `async def` routes, async SQLAlchemy sessions, async Redis

### TypeScript (apps/web, apps/admin, apps/mobile, packages/)
- Strict TypeScript (`"strict": true` in tsconfig)
- API response types come from `packages/types` — never redeclare them locally
- Use TanStack Query for all server state — no manual `useEffect` data fetching
- Components own UI only; data fetching via custom hooks in `hooks/`

### General
- Write clear, self-documenting code; add comments only where the logic is non-obvious
- Don't add speculative abstractions — solve the problem at hand
- Prefer editing existing files over creating new ones
- No broad exception catches — catch specific exceptions and handle them explicitly
- Validate at system boundaries (user input, external APIs); trust internal guarantees
- **Never use bare `pass` for stub implementations** — always use `raise NotImplementedError("not yet implemented")`. A stub that raises fails loudly; a `pass` silently does nothing and can go undetected for a long time.
- **Registration and creation flows must account for all downstream resource creation** — if the architecture requires related rows in other tables when a new entity is created (e.g. a `ProviderProfile` when a PROVIDER `User` registers), create them in the same transaction or raise `NotImplementedError` with a clear comment if intentionally deferred. Never silently omit them.

## Context Window Management

Proactively suggest a `/clear` or `/compact` when the conversation is getting long — specifically:
- After completing a multi-step implementation block (e.g., finishing a numbered Phase step)
- When 5+ large files have been read in the session
- Before starting a new major phase or feature area

Mention it briefly at the end of a response: e.g., "Good point to `/clear` before continuing with Step 4."

## Environment

- Python 3.13 (API uses apps/api/.venv — Python 3.14 lacks pre-built wheels for pydantic-core), Node 22, npm 11
- Windows 10 / bash shell
- Database: PostgreSQL 16 + PostGIS (via Docker locally, DigitalOcean Managed in prod)
- Cache/Queue: Redis 7
