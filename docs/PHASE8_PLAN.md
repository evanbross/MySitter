# Phase 8 — Test Coverage, Bug Fixes, Rate Limiting, HTML Emails

**Scope:** No new user-facing features. This phase hardens what exists: fixes confirmed bugs, fills the test suite, adds abuse protection, and upgrades transactional emails from plaintext to HTML.

**Gemini pass order:** Pass A = Steps 1 + 2 + 3. Pass B = Steps 4 + 5 + 6.

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

---

## Step 1 — Bug Fixes + ReviewService Audit

### Bug A — Wrong args to `listForProvider` on mobile

**File:** `apps/mobile/app/providers/[id].tsx`, line 26

```ts
// BEFORE (TypeScript error — passes number as params)
apiClient.reviews.listForProvider(id!, 1, 10)

// AFTER
apiClient.reviews.listForProvider(id!, { page: 1, page_size: 10 })
```

The method signature is `listForProvider(providerId: string, params?: { page?: number; page_size?: number })`. The call currently passes `1` as `params` (wrong type) and `10` as an ignored third argument.

### Bug B — "Leave Review" shown to providers

Both `BookingsPage.tsx` (web) and `apps/mobile/app/(tabs)/bookings.tsx` (mobile) render the "Leave Review" button for any `COMPLETED` booking with no role check. Providers who complete bookings should not be prompted to review themselves.

**Web — `apps/web/src/pages/BookingsPage.tsx`:**
Find the condition guarding the "Leave Review" button (around `booking.status === "COMPLETED"`) and add `!isProvider`:
```ts
// BEFORE
booking.status === "COMPLETED"

// AFTER
booking.status === "COMPLETED" && !isProvider
```

`isProvider` should be derived from `user?.role === "PROVIDER"` using the existing `useAuth()` hook already imported in that file.

**Mobile — `apps/mobile/app/(tabs)/bookings.tsx`:**
The `canReview` variable (around line 141) needs the same guard:
```ts
// BEFORE
const canReview = booking.status === "COMPLETED";

// AFTER
const canReview = booking.status === "COMPLETED" && user?.role !== "PROVIDER";
```

### Bug C — ReviewService role + duplicate guard audit

Open `apps/api/app/services/review_service.py`. Verify:

1. **Customer-only guard**: `create()` must reject providers with `403 Forbidden`. If the guard is missing, add it.
2. **Duplicate 409 guard**: if the customer has already reviewed this booking, `create()` must raise `409 Conflict`. If missing, add it (query for an existing review by `booking_id` + `reviewer_id` before inserting).
3. **Booking ownership check**: the booking must belong to the customer calling the endpoint. If missing, add it.

If any guard is already present, leave it alone. Only add what is missing.

---

## Step 2 — Test Suite: Booking Lifecycle + Auth

**File:** `apps/api/tests/test_bookings.py` (add to existing file — do not replace the 3 existing tests)

Add these tests:

```
test_full_booking_lifecycle
  - customer creates booking → 201, status PENDING
  - provider confirms → status CONFIRMED
  - provider completes → status COMPLETED

test_create_booking_invalid_times
  - end_at <= start_at → 422

test_confirm_requires_provider_role
  - customer attempts confirm → 403

test_complete_requires_confirmed_status
  - provider attempts complete on PENDING booking → 409

test_cancel_completed_booking_rejected
  - attempt to cancel a COMPLETED booking → 409

test_get_booking_wrong_user_rejected
  - third user (neither party) fetches booking → 403 or 404
```

**File:** `apps/api/tests/test_auth.py` (new file)

```
test_register_duplicate_email
  - register same email twice → second returns 409

test_login_wrong_password
  - correct email, wrong password → 401

test_me_requires_auth
  - GET /users/me with no token → 401

test_me_returns_correct_user
  - register, login, GET /users/me → email matches
```

The lifecycle test needs both `customer_token` and `provider_token` fixtures (already in `conftest.py`) plus the provider's user ID to create a booking pointing at them. If `conftest.py` doesn't expose `provider_user_id`, add a `provider_user` fixture that returns the full user object.

---

## Step 3 — Test Suite: Analytics, Referrals, Messaging

### `apps/api/tests/test_analytics.py` (new file)

```
test_analytics_requires_auth
  - GET /analytics/me with no token → 401

test_analytics_customer_rejected
  - customer token → 403

test_analytics_basic_tier_rejected
  - provider with BASIC subscription → 402

test_analytics_pro_returns_structure
  - provider with PRO subscription → 200 with fields:
    total_bookings (int), completion_rate (float), unique_customers (int),
    avg_rating (float), review_count (int)
```

For the tier tests: check how subscription tier is stored on `ProviderProfile`. If the test DB starts providers at BASIC by default, the 402 test should work without setup. For the PRO test, directly update the provider's `subscription_tier` in the DB via the session fixture before calling the endpoint.

### `apps/api/tests/test_referrals.py` (new file)

```
test_generate_referral_code
  - POST /referrals/generate → 201, code is non-empty string

test_generate_idempotent
  - generate twice → same code returned (or new code, but only one row in DB)
  - Note: check current behavior of the endpoint and match it

test_claim_valid_code
  - user A generates code, user B claims it → 200

test_claim_own_code_rejected
  - user claims their own code → 400 or 409

test_claim_already_used_code
  - user B claims, user C attempts same code → 409
```

### `apps/api/tests/test_messaging.py` (new file)

```
test_start_conversation
  - customer starts conversation with provider → 201, conversation_id returned

test_start_conversation_requires_auth
  - no token → 401

test_send_message
  - start conversation, send message → 201, message content matches

test_list_conversations_empty
  - fresh user lists conversations → 200, empty list

test_mark_read
  - send message, mark conversation read → 200
```

---

## Step 4 — Rate Limiting

**Dependency:** Add `slowapi==0.1.9` to `apps/api/requirements.txt`.

**File:** `apps/api/app/main.py`

Add limiter setup:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**File:** `apps/api/app/routers/auth.py`

Add to these endpoints:
```python
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):

@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, ...):

@router.post("/totp/verify")
@limiter.limit("10/minute")
async def verify_totp(request: Request, ...):
```

**File:** `apps/api/app/routers/reviews.py`

```python
@router.post("/bookings/{booking_id}")
@limiter.limit("5/minute")
async def create_review(request: Request, ...):
```

All decorated endpoints must add `request: Request` as the first parameter if not already present — `slowapi` requires it to extract the client IP.

---

## Step 5 — HTML Email Templates

**New file:** `apps/api/app/workers/email_templates.py`

Define one dataclass per email type. Each has a `subject() -> str` and `html_body() -> str` method. Use inline CSS (no external stylesheets — email clients strip `<style>` tags).

Email types to implement:
- `BookingRequestTemplate(provider_name, customer_name, start_at, end_at, service_type)`
- `BookingConfirmedTemplate(customer_name, provider_name, start_at, end_at)`
- `BookingCancelledTemplate(recipient_name, booking_start_at)`
- `BookingCompletedTemplate(customer_name, provider_name, review_link)` — includes CTA button to leave a review
- `SubscriptionRenewalTemplate(user_name, tier, renewal_date, portal_url)`

Design guidance: white card on light gray background, dark header bar (`#1a1a2e`), 14px body text, single CTA button in indigo (`#4338ca`), minimal inline CSS. Mobile-friendly single-column layout.

**File:** `apps/api/app/workers/tasks.py`

Replace all inline plaintext email strings with calls to the template classes:
```python
from app.workers.email_templates import BookingRequestTemplate

template = BookingRequestTemplate(...)
await resend.Emails.send({
    "subject": template.subject(),
    "html": template.html_body(),
    ...
})
```

---

## Step 6 — Completed Booking Notification + Offline Message Email

### 6a — COMPLETED status notification

**File:** `apps/api/app/workers/tasks.py`

The `send_booking_notification` task currently handles `PENDING`, `CONFIRMED`, and `CANCELLED` statuses. Add a `COMPLETED` case:

- Recipient: the **customer** (not the provider)
- Email: `BookingCompletedTemplate` (from Step 5) with a link to `{WEB_BASE_URL}/bookings/{booking_id}` where they can leave a review
- Push notification body: `"Your session with {provider_name} is complete. Tap to leave a review."`

### 6b — Offline message email delay

**File:** `apps/api/app/workers/tasks.py`

Add a new Celery task `notify_message_email`:

```python
@celery_app.task
def notify_message_email(conversation_id: str, recipient_user_id: str, sender_name: str) -> None:
    """
    Fires 5 minutes after a message is sent. Checks if the conversation has been
    read since the message was sent; if not, sends an email nudge.
    """
```

Logic:
1. Load the conversation from DB. Check `read_at` (or the recipient's last-seen timestamp).
2. If the conversation has been read since the message was sent, return early (no email).
3. If not read, send a "You have a new message from {sender_name}" email.

**File:** `apps/api/app/routers/conversations.py` (or wherever `send` is handled)

After inserting the message, enqueue the task with a 5-minute ETA:
```python
notify_message_email.apply_async(
    args=[str(conversation_id), str(recipient_user_id), sender_display_name],
    countdown=300,
)
```

---

## Files Modified / Created

| File | Change |
|---|---|
| `apps/mobile/app/providers/[id].tsx` | Fix `listForProvider` call args (Bug A) |
| `apps/web/src/pages/BookingsPage.tsx` | Add `!isProvider` guard on Leave Review (Bug B) |
| `apps/mobile/app/(tabs)/bookings.tsx` | Add role guard on `canReview` (Bug B) |
| `apps/api/app/services/review_service.py` | Audit + add missing guards (Bug C) |
| `apps/api/tests/test_bookings.py` | Add 6 lifecycle + state machine tests |
| `apps/api/tests/test_auth.py` | New — 4 auth tests |
| `apps/api/tests/test_analytics.py` | New — 4 analytics tests |
| `apps/api/tests/test_referrals.py` | New — 5 referral tests |
| `apps/api/tests/test_messaging.py` | New — 5 messaging tests |
| `apps/api/requirements.txt` | Add `slowapi==0.1.9` |
| `apps/api/app/main.py` | Mount slowapi limiter |
| `apps/api/app/routers/auth.py` | Rate limit login, register, totp/verify |
| `apps/api/app/routers/reviews.py` | Rate limit review creation |
| `apps/api/app/workers/email_templates.py` | New — 5 HTML email template classes |
| `apps/api/app/workers/tasks.py` | Use templates; add COMPLETED case; add `notify_message_email` task |
| `apps/api/app/routers/conversations.py` | Enqueue `notify_message_email` on message send |
