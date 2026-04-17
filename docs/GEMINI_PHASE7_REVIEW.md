# Gemini Phase 7 Code Review

**Reviewer:** Claude (claude-sonnet-4-6)
**Date:** 2026-04-16
**Phase:** Phase 7 — Stripe Checkout, Push Notifications, Referral Rewards, Web NavBar, Provider Settings Editor, Test Suite

---

## Summary

Phase 7 added substantial new functionality. The backend work (Celery tasks, Stripe integration, referral rewards dispatch) was solid. The biggest failures were in the mobile React component tree, type contracts, and test infrastructure. One bug (Bug 1) would cause a crash on every app launch.

**Bugs found:** 8
**Bugs fixed by this review:** 8
**Critical (crash/data loss):** 1
**High (feature broken at runtime):** 2
**Medium (TypeScript error/silent schema issue):** 3
**Low (test infra gap):** 2

---

## Bugs Found and Fixed

### Bug 1 — CRITICAL: `useAuth()` called outside `QueryClientProvider` (crash on launch)

**File:** `apps/mobile/app/_layout.tsx`
**Severity:** Critical — app crashes on every launch

`useAuth()` internally calls `useQuery()`, which requires a `QueryClientProvider` ancestor. Gemini placed `useAuth()` at the top of `RootLayout()` but `QueryClientProvider` was in the JSX return of that same function. Since hooks run before `return`, the context doesn't exist yet.

**Error at runtime:**
```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Fix:** Split into `RootLayout` (provides only `QueryClientProvider`) and an inner `RootLayoutInner` component that calls `useAuth` and runs the push token `useEffect`. The inner component is rendered inside the provider, so the context is available.

**Root pattern:** Gemini puts `useQuery`-based hooks in the same component that provides `QueryClientProvider`, forgetting that hooks run before the JSX renders.

---

### Bug 2 — HIGH: `users.updateMe` TypeScript type missing `expo_push_token`

**File:** `packages/api-client/src/client.ts`, line 161
**Severity:** High — TypeScript build error; `_layout.tsx` can't compile

Gemini defined `updateMe` with an inline type `{ display_name?: string; phone?: string; avatar_url?: string }` that omits `expo_push_token`. `_layout.tsx` calls `apiClient.users.updateMe({ expo_push_token: token })` which is a TypeScript error.

`UserUpdate` from `@mysitter/types` already includes `expo_push_token?: string` and was already imported in `client.ts`.

**Fix:** Changed the parameter type from the inline object to `UserUpdate`.

---

### Bug 3 — MEDIUM: Dead `users.registerPushToken` method

**File:** `packages/api-client/src/client.ts`, lines 163–165
**Severity:** Medium — dead code pointing to a non-existent endpoint

Gemini added a `registerPushToken` method that POSTs to `/users/me/push-token`. This endpoint does not exist. Push token registration goes through `PATCH /users/me` via `updateMe`. The method is dead and confusing.

**Fix:** Removed the method entirely.

---

### Bug 4 — HIGH: `API_URL` import doesn't exist

**File:** `apps/mobile/app/(tabs)/profile.tsx`, line 7
**Severity:** High — TypeScript error; runtime crash when opening provider profile link

`profile.tsx` imported `API_URL` from `../../lib/apiClient`. The actual export is `API_BASE`. At runtime, `Linking.openURL(`${API_URL.replace("/api", "")}/provider-settings`)` would call `.replace()` on `undefined` and throw.

**Fix:** Changed both the import and the usage to `API_BASE`.

**Root pattern:** Gemini generates export names from memory rather than checking the actual source file. `API_URL` appears in several Phase 5/6 files for the web app where it does exist, and Gemini copied the name without verifying it on mobile.

---

### Bug 5 — MEDIUM: `UserUpdateRequest` accepted `is_active` and `role` but silently discarded them

**File:** `apps/api/app/schemas/user.py`, lines 28–29 (pre-fix)
**Severity:** Medium — violates FastAPI/OpenAPI completeness rule; misleading API contract

`UserUpdateRequest` included `is_active: bool | None = None` and `role: UserRole | None = None`. The `PATCH /users/me` router only applies `display_name`, `phone`, `avatar_url`, and `expo_push_token`. These two fields were accepted by validation but never written to the database — a silent no-op that implies to API clients that they can change their own role and active state, which they cannot.

**Fix:** Removed `is_active` and `role` from `UserUpdateRequest`. Also removed the now-unused `UserRole` import.

---

### Bug 6 — MEDIUM: `aiosqlite` missing from `requirements-dev.txt`

**File:** `apps/api/requirements-dev.txt`
**Severity:** Medium — entire test suite fails immediately with `ModuleNotFoundError`

`conftest.py` creates the test database with `"sqlite+aiosqlite:///:memory:"`, which requires the `aiosqlite` package. It was not listed in `requirements-dev.txt`, meaning `pip install -r requirements-dev.txt` installs an environment where all tests fail before any test body runs.

**Fix:** Added `aiosqlite==0.20.0`.

---

### Bug 7 — MEDIUM: `BillingCheckoutPage` creates duplicate Stripe PaymentIntents

**File:** `apps/web/src/pages/BillingCheckoutPage.tsx`
**Severity:** Medium — creates orphaned Stripe objects in development; potential duplicate charges

`useEffect` called `apiClient.billing.subscribe(tier)` with `[tier, navigate]` as dependencies. React 18 StrictMode double-invokes effects in development, creating two `PaymentIntent` objects per page visit. Navigating away and back created additional intents each time.

**Fix:** Added a `useRef(false)` guard (`subscribeCalled`). The effect checks the ref and returns early if it has already fired, then sets it to `true` before calling `subscribe()`. Because `useRef` is not reset between StrictMode double-invocations, only one network call is made per component lifetime.

---

### Bug 8 — LOW: `useMyProviderProfile` missing `enabled` guard (Gemini Rule 1 violation)

**File:** `apps/web/src/hooks/useProviderSettings.ts` + `apps/web/src/pages/ProviderSettingsPage.tsx`
**Severity:** Low — unnecessary 403 API call for non-providers

`useMyProviderProfile` called `useQuery` unconditionally. `ProviderSettingsPage` redirects non-providers in a `useEffect`, which runs after the first render — meaning the API call fires once before the redirect for customers and admins landing on the route.

**Fix:** Added `enabled = true` parameter to `useMyProviderProfile`. `ProviderSettingsPage` passes `user?.role === "PROVIDER"` so the query only fires when the user is confirmed to be a provider.

**Root pattern:** This is Gemini Rule 1 — conditional queries must have an `enabled` guard. Gemini consistently omits `enabled` when query results are only valid in a specific role or auth state.

---

## What Gemini Got Right

- **Celery beat tasks** (`dispatch_referral_rewards`, `issue_referral_reward`): Correct SQLAlchemy 2.x `select(func.count()).select_from(q.subquery())` count pattern, correct idempotency check, correct async-to-sync session handling for Celery.
- **Avoiding duplicate migration**: Gemini correctly identified that `expo_push_token` was already in the users table from Phase 2 and did not generate a duplicate migration.
- **Alembic migrations** for service areas and referrals: Correct `Mapped`/`mapped_column` style, correct GeoAlchemy2 usage, no duplicate spatial index.
- **NavBar + route wiring**: `NavBar.tsx` self-hides on auth pages, role-aware navigation, all three new routes registered in `App.tsx`.
- **Test structure**: `conftest.py` fixture chain is correct (engine → session → client); test files are correct once the `aiosqlite` gap is filled.
- **Stripe `CheckoutForm`**: `confirmPayment` with `return_url` redirect pattern is correct.

---

## Recurring Patterns

| Pattern | Bug(s) | Gemini Rule |
|---|---|---|
| `useQuery` hook called outside its provider | Bug 1 | Rule 2 (QueryClientProvider placement) |
| Inline types instead of shared `@mysitter/types` | Bug 2 | Rule 8 (use shared types) |
| Export name copied from memory, not verified | Bug 4 | Rule 9 (verify import paths on mobile) |
| Unconditional `useQuery` without `enabled` guard | Bug 8 | Rule 1 |
| Dead/phantom API client methods | Bug 3 | Rule 8 |
| Effect without idempotency guard | Bug 7 | Rule 3 (StrictMode double-invoke) |

---

## Files Modified by This Review

| File | Change |
|---|---|
| `apps/mobile/app/_layout.tsx` | Split into `RootLayout` + `RootLayoutInner` to fix QueryClientProvider crash |
| `packages/api-client/src/client.ts` | `updateMe` uses `UserUpdate` type; removed dead `registerPushToken` method |
| `apps/mobile/app/(tabs)/profile.tsx` | `API_URL` → `API_BASE` (import + usage) |
| `apps/api/app/schemas/user.py` | Removed `is_active`, `role` from `UserUpdateRequest`; removed unused `UserRole` import |
| `apps/api/requirements-dev.txt` | Added `aiosqlite==0.20.0` |
| `apps/web/src/pages/BillingCheckoutPage.tsx` | Added `useRef(false)` guard on subscribe call |
| `apps/web/src/hooks/useProviderSettings.ts` | Added `enabled` parameter to `useMyProviderProfile` |
| `apps/web/src/pages/ProviderSettingsPage.tsx` | Passes `user?.role === "PROVIDER"` to `useMyProviderProfile` |
