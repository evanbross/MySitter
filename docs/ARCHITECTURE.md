# mysitter — System Architecture

> Pet & house sitting marketplace with calendar scheduling, geographic search,
> in-app messaging, passkey-first auth, and subscription-based provider tiers.

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│   React Web (Vite)   │   Expo Mobile   │   React Admin      │
└──────────┬───────────┴────────┬────────┴────────┬───────────┘
           │  HTTPS / WSS       │                 │
           ▼                    ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  REST API  │  WebSocket (chat)  │  Auth endpoints            │
└──────┬─────┴─────────┬──────────┴────────────────────────────┘
       │               │
  ┌────▼────┐    ┌──────▼──────┐    ┌─────────────┐
  │PostgreSQL│    │   Redis     │    │  DO Spaces  │
  │+PostGIS  │    │(cache/pub-  │    │  (S3-compat)│
  └──────────┘    │  sub/queue) │    └─────────────┘
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │   Celery    │
                  │  Workers    │
                  └─────────────┘
```

---

## 2. Monorepo Structure

Managed with **Turborepo** for shared builds, type-checking, and caching.

```
mysitter/
├── apps/
│   ├── api/                  ← FastAPI backend (Python)
│   ├── web/                  ← React + Vite (customer & provider web UI)
│   ├── mobile/               ← Expo (React Native) — iOS & Android
│   └── admin/                ← React Admin panel (site administrator)
├── packages/
│   ├── types/                ← Shared TypeScript types (API contracts)
│   └── api-client/           ← Shared fetch/WebSocket wrapper (web + mobile)
├── turbo.json
├── package.json
└── docker-compose.yml        ← Local dev: API + PostgreSQL + Redis
```

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend API | FastAPI (Python) | Async, native WebSocket, fast to develop |
| ORM | SQLAlchemy 2.x + Alembic | Mature, migrations, PostGIS support |
| Database | PostgreSQL 16 + PostGIS | Relational + geospatial queries |
| Cache / Pub-Sub | Redis | Celery broker, WebSocket fan-out, rate limiting |
| Task Queue | Celery | Emails, SMS, recurring booking generation |
| Auth | py_webauthn + pyotp + JWT | Passkeys-first, TOTP fallback, stateless |
| Web Frontend | React 19 + Vite | Preferred stack |
| Calendar UI | FullCalendar.io | Best-in-class, supports recurrence |
| Recurrence | rrule.js | RFC 5545 — "every Mon + Wed at 3pm" |
| Maps | Mapbox GL JS | Geographic search, provider service areas |
| Mobile | Expo (React Native) | iOS + Android, native feel, push notifications |
| Payments | Stripe | Subscription tiers, invoicing, dunning |
| Email | Resend | Modern API, reliable deliverability |
| SMS | Twilio | Industry standard, easy MMS/verification |
| Push | Expo Push Notifications | Unified iOS APNs + Android FCM |
| Admin UI | React Admin | Connects to FastAPI, zero custom data-table code |
| File Storage | DigitalOcean Spaces | S3-compatible, swap to AWS S3 with no code changes |
| Monorepo | Turborepo | Build caching, shared packages |

---

## 4. Data Model (Core Entities)

```
User
├── id, email, phone, display_name, avatar_url
├── role: PROVIDER | CUSTOMER | ADMIN
├── passkey_credentials[]   ← WebAuthn credentials
├── totp_secret             ← fallback MFA
└── subscription_tier       ← BASIC | PRO | PREMIUM (providers only)

ProviderProfile
├── user_id (FK)
├── bio, services[], hourly_rate, service_radius_miles
├── location: PostGIS GEOGRAPHY(POINT)
├── service_area: PostGIS GEOGRAPHY(POLYGON)  ← optional precise area
└── rating, review_count

Availability  ← provider sets open time blocks
├── provider_id, start_at, end_at
└── rrule_string  ← NULL = one-time, else recurring rule

Booking
├── id, customer_id, provider_id
├── status: PENDING | CONFIRMED | CANCELLED | COMPLETED
├── service_type: PET_SITTING | HOUSE_SITTING | DOG_WALKING | etc.
├── start_at, end_at
└── rrule_string  ← NULL = one-time, else recurring

BookingOccurrence  ← expanded instances of recurring bookings
├── booking_id, scheduled_at, status
└── notes

Conversation
├── id, customer_id, provider_id
└── created_at

Message
├── conversation_id, sender_id
├── body, read_at
└── created_at

Review
├── booking_id, reviewer_id, reviewee_id
├── rating (1–5), body
└── created_at

Subscription  ← provider's subscription to your platform
├── provider_id, stripe_subscription_id
├── tier: BASIC | PRO | PREMIUM
└── status, current_period_end
```

---

## 5. Authentication Flow

### Passkey-First (Primary Path)
```
1. User enters email
2. Backend checks for registered passkey credentials
3. Browser/device prompts biometric (Face ID, Touch ID, Windows Hello)
4. WebAuthn assertion verified server-side via py_webauthn
5. JWT access token + refresh token issued
```

### Fallback Path (no passkey registered, or old device)
```
1. Email + password login
2. TOTP code required (Google Authenticator / Authy)
3. JWT issued on success
```

### Passkey Registration
```
1. User registers with email + password + TOTP setup
2. After first login, prompted to register a passkey
3. Device credential stored in passkey_credentials table
4. Subsequent logins use passkey only
```

### Tokens
- **Access token**: 15-minute JWT, sent as `Authorization: Bearer`
- **Refresh token**: 30-day, stored in `httpOnly` cookie (web) or secure storage (mobile)

---

## 6. Scheduling & Calendar System

### Provider Availability
- Provider creates time blocks (single or recurring via rrule)
- Stored as `Availability` rows with optional `rrule_string`
- Frontend uses **FullCalendar** with the rrule plugin to render

### Customer Booking
- Customer selects from provider's available slots
- Booking can be one-time or recurring (e.g., every Tuesday at 10am)
- Recurring bookings generate `BookingOccurrence` rows via Celery task
  - Generated rolling 8 weeks ahead to avoid unbounded expansion
- Conflicts checked server-side before confirmation

### Calendar Views
- **Provider**: sees their own availability + booked slots
- **Customer**: sees their scheduled bookings
- Both views use FullCalendar on web, custom calendar on mobile

---

## 7. Geographic Search

Uses **PostGIS** on PostgreSQL — no separate search service needed at this scale.

```sql
-- Find providers within X miles of a point
SELECT p.*, ST_Distance(p.location, ST_MakePoint(:lon, :lat)::geography) AS dist_meters
FROM provider_profiles p
WHERE ST_DWithin(p.location, ST_MakePoint(:lon, :lat)::geography, :radius_meters)
  AND p.is_active = true
ORDER BY dist_meters;
```

- **Mapbox GL JS** renders the search map on web
- **Expo Maps** (react-native-maps) on mobile
- Provider sets service radius on their profile (e.g., "I travel up to 10 miles")
- Customer searches from their address or current GPS location

---

## 8. In-App Messaging

Real-time using **FastAPI native WebSockets** + **Redis pub/sub** for horizontal scaling.

```
Client A ──WS──► API Server 1 ──publish──► Redis Channel
                                              │
Client B ──WS──► API Server 2 ◄──subscribe───┘
```

- Each conversation has a Redis channel: `chat:{conversation_id}`
- Messages persisted to PostgreSQL immediately on receipt
- Unread count tracked per user
- Push/SMS notification sent if recipient is offline (via Celery)

---

## 9. Notification System

Handled by **Celery workers** triggered by booking events.

| Event | Email | SMS | Push |
|---|---|---|---|
| Booking request received | ✓ | ✓ | ✓ |
| Booking confirmed | ✓ | ✓ | ✓ |
| Booking reminder (24h before) | ✓ | ✓ | ✓ |
| Booking cancelled | ✓ | ✓ | ✓ |
| New message (user offline) | ✗ | ✗ | ✓ |
| New message (user offline >5min) | ✓ | ✗ | ✗ |
| Subscription renewal | ✓ | ✗ | ✗ |

- **Email**: Resend API + HTML templates (React Email for templating)
- **SMS**: Twilio REST API
- **Push**: Expo Push Notifications API (handles APNs + FCM routing)

---

## 10. Subscription & Billing

Providers pay **your platform** a monthly subscription. Customers pay providers directly off-platform.

### Subscription Tiers (example — adjust pricing as needed)
| Tier | Price | Limits |
|---|---|---|
| Basic | $19/mo | 1 service area, basic listing |
| Pro | $39/mo | 3 service areas, priority in search, booking calendar |
| Premium | $69/mo | Unlimited areas, top placement, analytics dashboard |

### Stripe Integration
- Stripe Customer created on provider registration
- Stripe Subscription created on tier selection
- Webhooks handle: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- Failed payment → grace period → listing deactivated
- Stripe Customer Portal for self-serve billing management

---

## 11. Admin Panel

**React Admin** connected to FastAPI with a dedicated `/admin` API route group (JWT-gated, ADMIN role only).

Capabilities:
- View/edit/deactivate any User, ProviderProfile, or Booking
- View all Conversations (moderation)
- View Subscription statuses and payment history
- Manually trigger notifications
- View system health metrics (booking volume, active users, etc.)

---

## 12. Infrastructure

### Development
```
docker-compose.yml
├── api        (FastAPI + Celery, hot-reload)
├── postgres   (PostgreSQL 16 + PostGIS)
├── redis      (Redis 7)
└── mailhog    (local email capture)
```

### Production (DigitalOcean — Initial)
```
DigitalOcean App Platform or Droplets
├── 2x API Droplets (2GB, behind Load Balancer)
├── Managed PostgreSQL (primary + standby)
├── Managed Redis
├── Spaces (object storage + CDN)
└── Load Balancer
```

### Migration Path to Scale
The containerized, stateless API design means scaling is straightforward:
- **More traffic**: add API Droplets horizontally (Redis pub/sub already handles this for WebSockets)
- **DB bottleneck**: add read replicas to Managed PostgreSQL
- **Global**: move to DigitalOcean's multi-region, or migrate to AWS ECS/EKS — Docker containers are portable

---

## 13. Project Phases

### Phase 0 — Foundation
- Monorepo setup (Turborepo), Docker Compose dev environment
- FastAPI project structure, database models, Alembic migrations
- Auth system: passkeys + TOTP fallback + JWT

### Phase 1 — Core Features
- Provider profiles + geographic search
- Availability calendar (provider side)
- Booking creation + management (customer side)
- Stripe subscription integration

### Phase 2 — Communication
- In-app messaging (WebSockets)
- Notification system (email + SMS + push)
- Mobile app (Expo) — feature parity with web

### Phase 3 — Polish & Admin
- React Admin panel
- Reviews + ratings
- Analytics dashboard for Pro/Premium providers
- Performance tuning, load testing

### Phase 4 — Growth
- Multi-region deployment
- Referral system
- Provider analytics
- SEO-optimized public profiles
