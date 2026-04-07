# mysitter — Third-Party Services & Cost Estimates

---

## Accounts You Need to Create

### 1. DigitalOcean — `digitalocean.com`
Your primary cloud host: servers, managed database, managed Redis, object storage.
- Create an account, add a payment method
- Enable 2FA on the account
- Later: create a **Team** so access can be shared with collaborators
- **What you'll use**: Droplets (VMs), Managed PostgreSQL, Managed Redis, Spaces (object storage + CDN), Load Balancer

### 2. Stripe — `stripe.com`
Handles provider subscription billing to your platform.
- Create an account (business details required for payouts)
- Complete **business verification** (takes 1–3 days; do this early)
- Enable **Stripe Billing** and the **Customer Portal**
- Set up **webhook endpoints** pointing to your API
- Note: Stripe has a separate **test mode** — use that during development

### 3. Twilio — `twilio.com`
SMS notifications and optionally phone number verification.
- Create an account
- Buy a phone number (~$1/month)
- Complete **A2P 10DLC registration** if sending to US numbers at scale (required by carriers; takes 1–2 weeks — start this early)
- Get your Account SID and Auth Token for `.env`

### 4. Resend — `resend.com`
Transactional email (booking confirmations, reminders, etc.).
- Create an account
- **Verify your sending domain** (add DNS records to your domain registrar — takes minutes)
- Get your API key
- Free tier: 3,000 emails/month, 100/day — covers development entirely

### 5. Mapbox — `mapbox.com`
Map rendering and geographic search UI.
- Create an account
- Get a **public access token** (used in frontend) and a **secret token** (backend geocoding if needed)
- Free tier: 50,000 map loads/month — covers development and early launch entirely

### 6. Expo — `expo.dev`
Mobile build infrastructure and push notification service.
- Create an account
- Install the Expo CLI (`npm install -g @expo/eas-cli`)
- Log in and run `eas build:configure` in your mobile app
- **EAS Build** compiles iOS/Android binaries in the cloud (no Mac required for iOS builds)

### 7. Apple Developer Program — `developer.apple.com`
Required to publish to the iOS App Store and send iOS push notifications.
- Enroll at $99/year (billed annually)
- Use a **company/organization enrollment** if this is a business (not personal)
- Takes 1–5 business days for approval — **do this before you need to ship**
- You'll link your Apple account to Expo for automated builds

### 8. Google Play Console — `play.google.com/console`
Required to publish to the Android Play Store.
- One-time $25 registration fee
- Create an account, accept developer agreement
- Link to Expo for automated builds

### 9. Domain Registrar — `namecheap.com` or `cloudflare.com`
Your domain name (e.g., `mysitter.com`).
- Search and purchase your domain (~$10–15/year for a .com)
- **Cloudflare** is recommended as the DNS provider even if you buy elsewhere — free DDoS protection, CDN, and SSL
- Point DNS to DigitalOcean after setup

### 10. GitHub — `github.com`
Source code hosting and CI/CD.
- You likely already have an account
- Create a new **private repository** for the monorepo
- Free for individuals; **GitHub Actions** (CI/CD) is free for 2,000 minutes/month on private repos

---

## Cost Estimates

> All prices are approximate USD as of early 2026. Always verify current pricing on each provider's website before committing.

---

### Phase 1 — Development & Testing (< 10 users)

The goal here is to keep costs minimal while building the product. Use free tiers aggressively and run everything on minimal infrastructure.

| Service | Plan | Monthly Cost |
|---|---|---|
| DigitalOcean Droplet | 1x Basic (2GB RAM) — runs API + Celery | $12 |
| DigitalOcean PostgreSQL | Managed, smallest (1 node, 1GB RAM) | $15 |
| DigitalOcean Redis | Managed, smallest | $15 |
| DigitalOcean Spaces | 250GB storage + CDN | $5 |
| Stripe | No monthly fee; 2.9% + $0.30/transaction | ~$0 (dev mode) |
| Twilio | 1 phone number + minimal SMS | ~$3 |
| Resend | Free tier (3,000 emails/month) | $0 |
| Mapbox | Free tier (50,000 loads/month) | $0 |
| Expo EAS | Free tier (limited builds) | $0 |
| Apple Developer | $99/year | ~$8 |
| Google Play | $25 one-time, amortized | ~$1 |
| Domain + DNS (Cloudflare) | .com domain + free Cloudflare | ~$1 |
| GitHub | Free (private repo + Actions) | $0 |
| **Total** | | **~$60/month** |

> **Note**: During pure development (before cloud deployment), your only costs are Apple ($8/mo) + domain ($1/mo) = ~$9/month. The $60/month kicks in once you spin up the DigitalOcean infrastructure.

---

### Phase 2 — Soft Launch / Local Testing (10–100 users)

More reliable infrastructure, redundancy on the database, real notification volume.

| Service | Plan | Monthly Cost |
|---|---|---|
| DigitalOcean Droplets | 2x Basic (2GB) behind Load Balancer | $24 |
| DigitalOcean Load Balancer | Standard | $12 |
| DigitalOcean PostgreSQL | Managed, 2-node (primary + standby, 2GB) | $50 |
| DigitalOcean Redis | Managed, 1GB | $15 |
| DigitalOcean Spaces | 250GB + CDN | $5 |
| Stripe | 0.5–0.8% of subscription revenue + card fees | Revenue-dependent |
| Twilio | ~500 SMS/month | ~$8 |
| Resend | Pro ($20/mo — 50,000 emails/month) | $20 |
| Mapbox | Free tier (still likely under limit) | $0 |
| Expo EAS | Production plan ($14/mo) | $14 |
| Apple Developer | $99/year | ~$8 |
| Domain + Cloudflare | | ~$1 |
| GitHub | Free | $0 |
| **Total (infra only)** | | **~$157/month** |

> **Stripe revenue offset**: If you have 20 providers on the Basic tier ($19/month), that's $380 MRR. Stripe takes ~$14 of that. Your platform nets ~$366/month — well above infrastructure costs.

---

### Phase 3 — Regional Growth (100–500 users)

Scaling the API tier, larger database, more notification volume, Mapbox overages kick in.

| Service | Plan | Monthly Cost |
|---|---|---|
| DigitalOcean Droplets | 4x General Purpose (4GB) | $96 |
| DigitalOcean Load Balancer | Standard | $12 |
| DigitalOcean PostgreSQL | Managed, 4GB RAM + read replica | $100 |
| DigitalOcean Redis | Managed, 2GB | $30 |
| DigitalOcean Spaces | 500GB + CDN | $10 |
| Stripe | ~1% of ~$3,000–$10,000 MRR | $30–100 |
| Twilio | ~5,000 SMS/month | ~$45 |
| Resend | Business ($90/mo — 500,000 emails) | $90 |
| Mapbox | Pay-as-you-go (past free tier) | ~$50 |
| Expo EAS | Team ($99/mo) | $99 |
| Apple Developer | $99/year | ~$8 |
| Domain + Cloudflare Pro | Cloudflare Pro adds DDoS/WAF | $20 |
| **Total (infra only)** | | **~$560–630/month** |

> **Revenue context**: 200 providers averaging the Pro tier ($39/month) = $7,800 MRR. Infrastructure is ~8% of revenue — a healthy ratio for a marketplace.

---

### Phase 4 — Nationwide Growth (500–5,000 users)

At this scale, consider migrating to AWS or upgrading to DigitalOcean Premium/Kubernetes. The architecture is containerized so migration is straightforward.

| Service | Estimated Monthly Cost |
|---|---|
| Cloud infrastructure (DigitalOcean or AWS) | $800–2,500 |
| Twilio (SMS at scale) | $200–500 |
| Resend or SendGrid | $150–400 |
| Mapbox | $200–600 |
| Expo EAS Enterprise | $300 |
| Cloudflare Business | $200 |
| Monitoring (Datadog or Grafana Cloud) | $100–300 |
| **Total (infra only)** | **~$2,000–4,800/month** |

> **Revenue context**: 1,000 providers at $39/month average = $39,000 MRR. Infrastructure at this phase is roughly 5–12% of revenue. Adding a support tool (Intercom or similar) and a monitoring stack (Datadog) would be the next meaningful cost additions.

---

## Cost Summary Table

| Phase | Users | Monthly Infrastructure | Notes |
|---|---|---|---|
| Development | 0–10 | $0–60 | $0 before cloud deploy; $60 once deployed |
| Soft Launch | 10–100 | ~$157 | Profitable with ~20+ paying providers |
| Regional Growth | 100–500 | $560–630 | ~8% of revenue at 200 providers |
| Nationwide | 500–5,000 | $2,000–4,800 | ~5–12% of revenue at scale |

---

## Account Setup Priority Order

Do these **before writing any code** to avoid delays later:

1. **Apple Developer** — slowest approval (1–5 days), must be done early
2. **Stripe** — business verification takes 1–3 days
3. **Twilio** — A2P 10DLC registration if you plan SMS (1–2 weeks)
4. **Domain** — buy it now, cheap, and start building DNS records
5. **DigitalOcean** — set up when ready to deploy
6. **GitHub** — likely already done
7. **Resend, Mapbox, Expo, Google Play** — quick signups, can be done day-of

---

## Free Tier Summary

These services cost nothing during development:

| Service | Free Tier Limit |
|---|---|
| Resend | 3,000 emails/month |
| Mapbox | 50,000 map loads/month |
| Expo EAS | Limited builds (plenty for dev) |
| GitHub Actions | 2,000 CI minutes/month |
| Cloudflare DNS | Always free |
| Stripe (test mode) | Unlimited test transactions |
