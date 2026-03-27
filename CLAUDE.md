# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) — community events discovery and management platform, part of the Mukoko ecosystem. Full-stack monorepo: Next.js 16 frontend (Vercel) + Cloudflare Workers backend (Hono, D1, Vectorize, Workers AI, R2, KV).

## Build & Dev Commands

```bash
# Frontend (root directory)
npm install && npm run dev          # Dev server at http://localhost:3000
npm run build                       # Production build (Next.js)
npm run lint                        # ESLint

# Backend (worker/ directory)
cd worker && npm install && npm run dev   # Dev server at http://localhost:8787
cd worker && npm run deploy               # Deploy to Cloudflare
cd worker && npx tsc --noEmit             # Type check worker (production code only)

# Tests (Vitest for both)
npx vitest run                      # Frontend tests (from root)
npx vitest run src/lib/api.test.ts  # Single frontend test file
cd worker && npx vitest run         # Backend tests
cd worker && npx vitest run src/__tests__/auth.test.ts  # Single backend test file

# Database migrations
cd worker && wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/your-migration.sql
```

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs 5 parallel jobs on every push to any branch:
1. **Lint & Build** — `npm run lint` + `npm run build` (placeholder env vars)
2. **Frontend Tests** — `npm run test:run`
3. **Worker Tests** — `cd worker && npx vitest run`
4. **Worker Type Check** — `cd worker && npx tsc --noEmit`
5. **Validate Migrations** — checks migration SQL files exist and are non-empty

All 5 must pass. The build uses placeholder env vars so `NEXT_PUBLIC_*` values don't need real secrets.

## Architecture

### Frontend → Backend Communication

All frontend API calls go through `src/lib/api.ts` (centralized client) → Cloudflare Worker at `NEXT_PUBLIC_API_URL`. Write operations pass session JWT as `Authorization: Bearer` header.

### Backend Routing (Hono)

`worker/src/index.ts` (~186 lines) is the entry point using the **Hono** framework with modular route mounting:
```ts
app.route("/api/events", events);
app.route("/api/auth", auth);
app.route("/api/payments", payments);
```

Global middleware applied in `index.ts`: CORS (restricted to trusted origins), environment validation (logs missing bindings on first request), security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), observability (request IDs + structured logging), rate limiting (all API endpoints), error handling (generic messages — no error details leaked), 404 handler, and queue consumer.

**18 route modules** in `worker/src/routes/`:

| Route Module | Endpoints |
|-------------|-----------|
| `events.ts` | Event CRUD, list, filtering, cancel, CSV export |
| `admin.ts` | Admin dashboard, user suspend/activate, growth metrics |
| `health.ts` | Health checks, system probes for D1/Vectorize/R2/KV |
| `auth.ts` | `/api/auth/sync` JWT validation, user sync, suspended user enforcement |
| `users.ts` | Profile management, onboarding, account deletion (soft delete) |
| `registrations.ts` | Event registrations (atomic capacity checks, race condition prevention) |
| `stats.ts` | Community stats, peak time calculation, event analytics |
| `media.ts` | Image upload to R2 (10MB limit) |
| `search.ts` | RAG search via Vectorize |
| `categories.ts` | Category listing (DB-only), cities (derived from published events) |
| `ai.ts` | AI routes (assistant, description generator) with prompt injection detection |
| `referrals.ts` | Referral tracking (writeAuth protected) |
| `reviews.ts` | Event reviews (writeAuth protected) |
| `series.ts` | Recurring event series CRUD (RRULE support) |
| `waitlist.ts` | Waitlist join/leave/list (auth-protected) |
| `checkin.ts` | QR-based check-in and attendance stats |
| `kiosk.ts` | TV-style kiosk pairing (6-char codes), session management for on-site check-in and digital signage |
| `payments.ts` | Payment intents, Paynow webhooks (HMAC-SHA512 verified), status checks |

### Middleware (`worker/src/middleware/`)

- `auth.ts` — JWT extraction, validation, timing-safe API key comparison
- `observability.ts` — Request ID generation and structured logging
- `rate-limit.ts` — Rate limiting for all API endpoints (100 req/min)
- `ai-safety.ts` — Prompt injection detection, input sanitization, max length enforcement
- `index.ts` — Barrel export for auth middleware (`writeAuth`, `apiKeyRequired`, `getAdminUser`, `isAllowedOrigin`, `validateApiKey`)

### Utils (`worker/src/utils/`)

- `db.ts` — Database query helpers
- `ids.ts` — ID generation (short codes, slugs)
- `response.ts` — Consistent JSON response formatting
- `validation.ts` — Input validation schemas
- `timeout.ts` — Request timeout handling
- `circuit-breaker.ts` — Netflix Hystrix-inspired circuit breaker (CLOSED→OPEN→HALF_OPEN)
- `retry.ts` — Exponential backoff with jitter
- `observability.ts` — Backend structured logging with `[mukoko]` prefix
- `audit.ts` — Audit logging to `audit_logs` table
- `export.ts` — CSV export with proper escaping
- `index.ts` — Barrel export for common utilities

### Queues (`worker/src/queues/`)

- `handlers.ts` — Queue message processors for analytics and email background jobs (consumed in `index.ts`)

### Email (`worker/src/email/`)

- `resend.ts` — Fetch-based Resend API client (no SDK, Workers-compatible)
- `templates.ts` — 5 email templates: registration confirmed, event reminder, event cancelled, host new registration, registration cancelled
- `triggers.ts` — Queue message producers for each email type

### Payments (`worker/src/payments/`)

- `types.ts` — PaymentProvider interface abstraction
- `paynow.ts` — Paynow provider for Zimbabwean mobile money (EcoCash, OneMoney, Telecash) with HMAC-SHA512 webhook signature validation (timing-safe comparison)

### Authentication Flow

1. Frontend uses **Stytch Consumer SDK** (magic links + OTP) — session managed client-side via `StytchProvider` (`src/components/auth/stytch-provider.tsx`)
2. On login, `AuthProvider` (`src/components/auth/auth-context.tsx`) calls `/api/auth/sync` with the Stytch session JWT
3. Backend validates JWT locally using Stytch's JWKS endpoint (`worker/src/auth/stytch.ts`) — no Stytch API secret needed
4. `getAuthenticatedUser()` returns `AuthResult` with structured `failureReason` (e.g., `token_expired`, `issuer_mismatch`, `jwks_fetch_failed`, `invalid_signature`)
5. If `/api/auth/sync` fails, user stays logged out (no fallback user creation)
6. **Suspended user enforcement**: `/api/auth/sync` and `/api/auth/me` check `deleted_at` — suspended users get 403 with `reason: "account_suspended"`

Authentication page: `src/app/authenticate/page.tsx`. Stytch theme overrides: `src/app/stytch-overrides.css`.

### Write Operation Authorization

Protected endpoints use either:
- **JWT auth** via `getAuthenticatedUser()` for user-specific operations (onboarding, profile)
- **writeAuth middleware** — Origin check via `isAllowedOrigin()` OR API key via `X-API-Key` header (timing-safe comparison)

Trusted domains are hardcoded in the worker: `nyuchi.com`, `mukoko.com`, `nhimbe.com` and all subdomains are always allowed.

### AI Features (`worker/src/ai/`)

- **RAG Search** (`search.ts`): BGE-base-en-v1.5 embeddings → Cloudflare Vectorize → Llama 3.1 8B summaries
- **AI Assistant** (`assistant.ts`): "Shamwari" chat interface
- **Description Wizard** (`description-generator.ts`): Qwen 3 30B generation
- **Embeddings** (`embeddings.ts`): Shared embedding utilities
- **AI Safety** (`middleware/ai-safety.ts`): Prompt injection detection on all AI routes

### Resilience Patterns (Mukoko Registry)

- **Circuit Breaker** (`worker/src/utils/circuit-breaker.ts`) — Per-provider configs for stytch, vectorize, ai, r2
- **Retry with Backoff** (`worker/src/utils/retry.ts`) — Exponential backoff with jitter for transient failures
- **Structured Logging** — `[mukoko]` prefix on all log output (frontend: `src/lib/observability.ts`, backend: `worker/src/utils/observability.ts`)
- **Section Error Boundary** (`src/components/error/section-error-boundary.tsx`) — 3-layer error boundary with retry

## Frontend Structure

### Pages (`src/app/`)
- Home, events (create/detail/manage), my-events, profile, admin (events/users/settings/signage/support)
- Auth: `/authenticate`, `/auth/signin`, `/auth/error`
- Info: search, calendar, about, help, privacy, terms
- Short links: `/e/[shortCode]`
- Signage: `/signage` (TV/kiosk display mode)
- Event sub-pages: `/events/[id]/kiosk` (on-site check-in), `/events/[id]/signage` (digital signage display)
- SEO: `robots.ts`, `sitemap.ts` for search engine optimization

### UI Component Architecture (Mukoko Registry)

**34 shadcn/Radix primitives** installed from the Mukoko registry (`registry.mukoko.com`). All components use `data-slot` attributes, CVA variants, and Radix primitives for accessibility.

**Core primitives** (`src/components/ui/`): button, card, badge, input, dialog, drawer, tabs, select, dropdown-menu, separator, sheet, label, textarea, switch, toggle, scroll-area, skeleton, avatar, popover, tooltip, form, checkbox, radio-group, progress, calendar, sonner, spinner, collapsible, hover-card, navigation-menu, breadcrumb, pagination, table, toggle-group

**Mukoko-exclusive components** (`src/components/ui/`): rating (interactive star rating with mineral gold accent), stats-card (metric display with trend indicators), filter-bar (horizontal chip filter with single/multi mode), status-indicator (status dot with pulse animation), timeline (composable vertical timeline with mineral dot colors), copy-button (clipboard with copied state), file-upload (drag-and-drop with validation), share-dialog (WhatsApp/X/Email sharing modal), lazy-section (TikTok-style FIFO mount queue with IntersectionObserver), detail-layout (shared detail page layout with hero/sidebar/back nav)

**Composite components**: responsive-modal (Drawer on mobile / Dialog on desktop), share-button, invite-friends, event-ratings, host-reputation, referral-leaderboard, AI description wizard, address-autocomplete, QR code, popularity-badge, community-insights, city-dropdown, animated-background, gradient-background, live-region (ARIA live announcements), theme-toggle

**Total**: 63 component files in `src/components/ui/` (including barrel `index.ts`)

**Config**: `components.json` at root — shadcn new-york style, RSC, Tailwind v4, Lucide icons

### Components (`src/components/`)
- `ui/` — 34 shadcn primitives + domain-specific composites (ratings, reputation, referrals, AI wizard)
- `auth/` — `auth-context.tsx`, `stytch-provider.tsx`, `auth-guard.tsx` + tests
- `modals/` — ResponsiveModal-based sheets for category, date, location, capacity, description, ticketing
- `prompts/` — Onboarding: name, location, interests
- `layout/` — Header, footer
- `error/` — `section-error-boundary.tsx` (Mukoko 3-layer pattern)
- `pwa/` — Service worker registration

### Event Form Decomposition (`src/app/events/create/`)
- `create-event-form.tsx` — Main form (~377 lines)
- `cover-image-upload.tsx` — Cover image upload with preview
- `theme-selector.tsx` — Mineral theme picker with carousel
- `event-options-card.tsx` — Ticketing, approval, capacity settings
- `form-field-row.tsx` — Reusable field row component

### Event Detail Decomposition (`src/app/events/[id]/`)
- `event-detail-content.tsx` — Main layout (~208 lines)
- `event-cover.tsx` — Cover image with badges, stats overlay
- `event-sidebar.tsx` — Ticket card, insights, QR code, friends, host reputation
- `event-actions.tsx` — Event action buttons
- `event-map.tsx` — Map integration
- `event-qr-code.tsx` — QR code display
- `event-theme-wrapper.tsx` — Theme-aware wrapper
- `event-weather.tsx` — Weather display for event location
- `rsvp-button.tsx` — RSVP/registration button
- `kiosk/` — On-site kiosk check-in sub-page (host pairing flow)
- `signage/` — Digital signage display sub-page
- `manage/` — Event management page

### Frontend Libraries (`src/lib/`)

- `api.ts` — Centralized API client for all backend calls
- `calendar.ts` — Calendar/date utilities (with `calendar.test.ts`)
- `timezone.ts` — Timezone handling utilities (with `timezone.test.ts`)
- `fallback-chain.ts` — Fallback chain pattern for resilient data loading
- `use-focus-trap.ts` — Focus trap hook for modal accessibility
- `themes.ts` — Mineral theme definitions
- `observability.ts` — Frontend structured logging (`[mukoko]` prefix)
- `utils.ts` — Shared utilities including `cn()` class merger (with `utils.test.ts`)

### i18n (`src/lib/i18n/`)

Lightweight custom i18n with `t()`, `setLocale()`, `getLocale()`. Languages: English (default) + Shona.

### PWA

Service worker at `public/sw.js` — cache-first for static assets, network-first for API calls. Registered in production via `src/components/pwa/sw-register.tsx`.

### State Management
- **React Context** only — `AuthProvider` (JWT + user state), `ThemeProvider` (dark/light mode)
- No Redux/Zustand

## Testing

### Frontend Tests (8 files, 160 tests)

Tests colocate with modules (e.g., `src/lib/api.test.ts`) or live in `src/__tests__/`. Config: `vitest.config.ts` with jsdom and React plugin. Test setup: `src/__tests__/setup.ts`.

- `src/lib/api.test.ts` — API client tests
- `src/lib/utils.test.ts` — Utility function tests
- `src/lib/calendar.test.ts` — Calendar utility tests (32 tests)
- `src/lib/timezone.test.ts` — Timezone handling tests
- `src/components/auth/auth-context.test.tsx` — Auth context tests (9 tests)
- `src/components/auth/auth-guard.test.tsx` — Auth guard tests (4 tests)
- `src/__tests__/seo.test.ts` — SEO metadata tests (25 tests)
- `src/__tests__/accessibility.test.ts` — Accessibility compliance tests (18 tests)

### Backend Tests (10 files, 283 tests)

All backend tests live in `worker/src/__tests__/`. Config: `worker/vitest.config.ts` with `globals: true`.

- `auth.test.ts` — JWT validation, JWKS caching, failure reasons
- `auth-profile.test.ts` — User sync and profile management
- `events.test.ts` — Event CRUD, pagination, cancellation, CSV export
- `registrations.test.ts` — Registration flow, atomic capacity checks, waitlist auto-promotion
- `users.test.ts` — User management, soft delete, PII anonymization
- `validation.test.ts` — Input validation, security checks
- `ai-layers.test.ts` — AI feature testing
- `security.test.ts` — Authorization, origin checks, API key validation
- `observability.test.ts` — Logging, request IDs
- `routes-coverage.test.ts` — Health, categories, cities, checkin, media, payments, referrals, reviews, series, waitlist, admin, stats, security headers, AI safety, Paynow HMAC

**Mock architecture** (`worker/src/__tests__/mocks.ts`) — 4 layers:
- **L1: Primitives** — `createMockD1()`, `createMockKV()`, `createMockR2()`, `createMockVectorize()`, `createMockAI()`
- **L2: Env Factory** — `createMockEnv()` combines all bindings
- **L3: Request Builders** — `createRequest()`, `createAuthenticatedRequest()`, `createApiKeyRequest()`
- **L4: Domain Fixtures** — `createEventFixture()`, `createEventDbRow()`

**Note:** Worker test files (`__tests__/**`, `*.test.ts`, `*.spec.ts`) are excluded from `worker/tsconfig.json` so `tsc --noEmit` only checks production code.

## Database

**Primary: Cloudflare D1 (SQLite).** Schema: `worker/src/db/schema.sql`. Migrations: `worker/src/db/migrations/`.

**Planned future: MongoDB Atlas.** Connected via `MONGODB_URI` secret. Not yet active — D1 is the current primary database.

### Core Tables
`events` (schema.org Event), `users` (schema.org Person with roles), `registrations`, `follows`, `themes`

### Features Tables
`event_reviews`, `referrals`, `user_referral_codes`, `event_series`, `waitlists`, `payments`

### Analytics Tables
`event_views`, `search_queries`, `ai_conversations`, `audit_logs`

### Kiosk/Signage Tables
`kiosk_pairings` (TV-style pairing codes for on-site devices)

### Migrations (11 files)
`add_stytch_auth.sql`, `add_meeting_fields.sql`, `add_ticketing_fields.sql`, `add_reviews_referrals.sql`, `004_add_user_roles.sql`, `005_backend_hardening.sql` (soft deletes, audit logs, categories table, FTS5), `006_event_series.sql`, `007_waitlists_payments.sql`, `008_seed_categories.sql` (seeds 32 categories into DB), `009_schema_org_alignment.sql` (renames columns to match schema.org vocabulary — `review_body`, `date_created`/`date_modified`, `address_locality`/`address_country`), `010_kiosk_sessions.sql` (kiosk pairing codes and session tables)

## Key Files

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | Hono app entry, routing, middleware setup |
| `worker/src/types.ts` | Backend type definitions (Cloudflare bindings, DB models) |
| `worker/src/auth/stytch.ts` | JWT validation with JWKS, `AuthResult` type |
| `worker/src/middleware/auth.ts` | Auth middleware, timing-safe API key validation |
| `worker/src/middleware/ai-safety.ts` | Prompt injection detection |
| `worker/src/utils/circuit-breaker.ts` | Circuit breaker for external services |
| `worker/src/email/` | Resend email client, templates, triggers |
| `worker/src/payments/` | Payment provider abstraction (Paynow) |
| `worker/src/db/schema.sql` | D1 database schema |
| `worker/src/db/migrations/` | SQL migration files |
| `src/lib/api.ts` | All frontend API client functions |
| `src/lib/observability.ts` | Frontend structured logging (`[mukoko]` prefix) |
| `src/lib/i18n/index.ts` | i18n translations (English + Shona) |
| `src/lib/themes.ts` | Mineral theme definitions |
| `src/components/auth/auth-context.tsx` | Auth state management, Stytch sync |
| `src/components/error/section-error-boundary.tsx` | Mukoko 3-layer error boundary |
| `src/components/ui/share-button.tsx` | WhatsApp-first social sharing |
| `worker/src/routes/kiosk.ts` | Kiosk pairing, session management |
| `worker/src/queues/handlers.ts` | Queue message processors (analytics, email) |
| `worker/wrangler.toml` | Cloudflare bindings and env config |
| `src/lib/calendar.ts` | Calendar/date utilities |
| `src/lib/timezone.ts` | Timezone handling |
| `src/lib/fallback-chain.ts` | Fallback chain pattern for resilient loading |
| `CONTRIBUTING.md` | Contribution guidelines |
| `SECURITY.md` | Security policy and reporting |
| `RELEASES.md` | Release notes |

## Code Conventions

- **Brand**: Always lowercase "nhimbe" — even at sentence start
- **TypeScript strict mode** in both frontend and backend
- **Tailwind CSS v4** with `cn()` helper from `src/lib/utils.ts` for conditional classes
- **React Context** for global state (AuthProvider, ThemeProvider) — no Redux/Zustand
- **`"use client"`** directive required for interactive components
- **WCAG AAA** compliance — 7:1+ contrast ratios for primary/secondary text, 44px touch targets
- **Dark/light modes** via `.dark` and `.light` CSS classes, design tokens in `globals.css`
- **Schema.org alignment** — Events and users modeled after schema.org specs
- **Structured logging** — `[mukoko]` prefix on all log output, structured JSON in backend
- **Request ID tracking** — Every backend request gets a unique ID for observability
- **Audit logging** — All destructive operations logged to `audit_logs` table
- **Path alias** — `@/*` maps to `./src/*` in frontend

## Environment Variables

Frontend (`.env.local`): `NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Backend (`worker/.dev.vars`): `API_KEY`, `MONGODB_URI`, `RESEND_API_KEY`

Backend (`worker/wrangler.toml` vars): `ENVIRONMENT`, `ALLOWED_ORIGINS`, `STYTCH_PROJECT_ID` (public value for JWKS validation — different per environment)

Backend secrets: `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY` (set via `wrangler secret put`)

Cloudflare bindings: `AI` (Workers AI), `VECTORIZE`, `DB` (D1), `CACHE` (KV), `MEDIA` (R2), `IMAGES`, `ANALYTICS`, `ANALYTICS_QUEUE`, `EMAIL_QUEUE`, `RATE_LIMITER`
