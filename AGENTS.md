# Codex Agent Instructions — MySitter

## Shared coding standards

Read and follow **CODEX_CODING_STANDARDS.md** located at:
`..\Dev-Standards\CODEX_CODING_STANDARDS.md`

It contains Codex-specific standards and explicitly requires reading
`COMMON_CODING_STANDARDS.md`, so follow it as the primary standards entrypoint.

---

## Project overview

Pet and house sitting marketplace monorepo.

Backend is FastAPI in `apps/api/`. Web customer/provider UI is React + Vite in
`apps/web/`. Admin UI is React in `apps/admin/`. Mobile app is Expo React
Native in `apps/mobile/`. Shared TypeScript contracts and client utilities live
in `packages/types/` and `packages/api-client/`.

Core domain areas already implemented include auth/passkeys, provider profiles,
customer profiles, bookings, messaging, billing, reviews, referrals, analytics,
notifications, and admin operations.

Key files:
- `apps/api/app/main.py` — FastAPI application entrypoint
- `apps/api/app/core/config.py` — runtime configuration
- `apps/api/app/core/database.py` — SQLAlchemy engine/session setup
- `apps/api/app/models/` — ORM models
- `apps/api/app/schemas/` — request/response schemas
- `apps/api/app/services/` — business logic layer
- `apps/api/app/routers/` — API endpoints; keep routers thin
- `apps/api/app/workers/tasks.py` — background job tasks
- `apps/web/src/App.tsx` — main web app shell and routing
- `apps/web/src/pages/` — web app route-level screens
- `apps/web/src/hooks/` — TanStack Query and app data hooks
- `apps/web/src/lib/apiClient.ts` — web app API client wiring
- `apps/admin/src/App.tsx` — admin app shell
- `apps/admin/src/dataProvider.ts` — admin API integration
- `packages/types/src/index.ts` — shared API/domain types
- `packages/api-client/src/client.ts` — shared HTTP client
- `packages/api-client/src/ws-client.ts` — shared WebSocket client

Additional project context:
- `CLAUDE.md` — project-specific engineering guidance and conventions
- `docs/ARCHITECTURE.md` — system architecture
- `docs/LOCAL_DEV_SETUP.md` — local environment setup
- `docs/SERVICES_AND_COSTS.md` — third-party services and operational notes
