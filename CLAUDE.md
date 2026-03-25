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

All frontend API calls go through `src/lib/api.ts` (centralized client, 687 lines, 20+ exported types) → Cloudflare Worker at `NEXT_PUBLIC_API_URL`.

### Backend Routing (Hono)

`worker/src/index.ts` (~110 lines) is the entry point using the **Hono** framework with modular route mounting:
```ts
app.route("/api/events", events);
app.route("/api/auth", auth);
app.route("/api", search);
```

Global middleware applied in `index.ts`: CORS, observability (request IDs), rate limiting, error handling, 404 handler, and queue consumer.

**14 route modules** in `worker/src/routes/`:

| Route Module | Lines | Endpoints |
|-------------|-------|-----------|
| `events.ts` | 415 | Event CRUD, list, filtering by city/category |
| `admin.ts` | 527 | Admin operations (events, users, content moderation) |
| `health.ts` | 358 | Health checks, system probes for D1/Vectorize/R2/KV |
| `seed.ts` | 330 | Database seeding with sample data |
| `auth.ts` | 209 | `/api/auth/sync` JWT validation, user sync |
| `users.ts` | 167 | Profile management, onboarding |
| `registrations.ts` | 157 | Event registrations |
| `stats.ts` | 95 | Community insights |
| `media.ts` | 89 | Image upload to R2 |
| `search.ts` | 68 | RAG search via Vectorize |
| `categories.ts` | 58 | Category listing |
| `ai.ts` | 56 | AI routes (assistant, description generator) |
| `referrals.ts` | 55 | Referral tracking |
| `reviews.ts` | 37 | Event reviews |

### Middleware (`worker/src/middleware/`)

- `auth.ts` — JWT extraction and validation
- `observability.ts` — Request ID generation and logging
- `rate-limit.ts` — Rate limiting for AI/auth/search (100 req/min)

### Utils (`worker/src/utils/`)

- `db.ts` — Database query helpers
- `ids.ts` — ID generation (short codes, slugs)
- `response.ts` — Consistent JSON response formatting
- `validation.ts` — Input validation schemas
- `timeout.ts` — Request timeout handling

### Authentication Flow

1. Frontend uses **Stytch Consumer SDK** (magic links + OTP) — session managed client-side via `StytchProvider` (`src/components/auth/stytch-provider.tsx`)
2. On login, `AuthProvider` (`src/components/auth/auth-context.tsx`) calls `/api/auth/sync` with the Stytch session JWT
3. Backend validates JWT locally using Stytch's JWKS endpoint (`worker/src/auth/stytch.ts`) — no Stytch API secret needed
4. `getAuthenticatedUser()` returns `AuthResult` with structured `failureReason` (e.g., `token_expired`, `issuer_mismatch`, `jwks_fetch_failed`, `invalid_signature`)
5. If `/api/auth/sync` fails, `AuthProvider` has a fallback that creates a temporary user object with `onboardingCompleted: false` — this can mask JWT validation failures

Authentication page: `src/app/authenticate/page.tsx`. Stytch theme overrides: `src/app/stytch-overrides.css`.

### Write Operation Authorization

Protected endpoints use either:
- **JWT auth** via `getAuthenticatedUser()` for user-specific operations (onboarding, profile)
- **Origin check** via `isAllowedOrigin()` OR **API key** via `X-API-Key` header for write operations (create/update events, registrations)

Trusted domains are hardcoded in the worker: `nyuchi.com`, `mukoko.com`, `nhimbe.com` and all subdomains are always allowed.

### AI Features (`worker/src/ai/`)

- **RAG Search** (`search.ts`): BGE-base-en-v1.5 embeddings → Cloudflare Vectorize → Llama 3.1 8B summaries
- **AI Assistant** (`assistant.ts`): "Shamwari" chat interface
- **Description Wizard** (`description-generator.ts`): Qwen 3 30B generation
- **Embeddings** (`embeddings.ts`): Shared embedding utilities

## Frontend Structure

### Pages (`src/app/`)
- Home, events (create/detail/manage), my-events, profile, admin (events/users/settings/support)
- Auth: `/authenticate`, `/signin`, `/error`
- Info: search, calendar, about, help, privacy, terms
- Short links: `/e/[shortCode]`

### Components (`src/components/`, 47 files)
- `ui/` (27 files) — Buttons, cards, badges, modals, AI wizard, address autocomplete, QR code, referral leaderboard, ratings
- `auth/` (5 files) — `auth-context.tsx`, `stytch-provider.tsx`, `auth-guard.tsx` + tests
- `modals/` (7 files) — Bottom sheets for category, date, location, capacity, description, ticketing
- `prompts/` (3 files) — Onboarding: name, location, interests
- `layout/` (2 files) — Header, footer

### State Management
- **React Context** only — `AuthProvider` (JWT + user state), `ThemeProvider` (dark/light mode)
- No Redux/Zustand

## Testing

### Frontend Tests (8 files)

Tests colocate with modules (e.g., `src/lib/api.test.ts`) or live in `src/__tests__/`. Config: `vitest.config.ts` with jsdom and React plugin.

- `src/lib/api.test.ts` — API client (13,045 lines)
- `src/lib/calendar.test.ts`, `timezone.test.ts`, `utils.test.ts` — Utilities
- `src/components/auth/auth-context.test.tsx`, `auth-guard.test.tsx` — Auth components
- `src/__tests__/accessibility.test.ts` — WCAG AAA compliance
- `src/__tests__/seo.test.ts` — SEO metadata validation

### Backend Tests (6 files + mocks)

All backend tests live in `worker/src/__tests__/`. Config: `worker/vitest.config.ts` with `globals: true`.

- `auth.test.ts` — JWT validation, JWKS caching, failure reasons
- `auth-profile.test.ts` — User sync and profile management
- `validation.test.ts` — Input validation, security checks
- `ai-layers.test.ts` — AI feature testing
- `security.test.ts` — Authorization, origin checks, API key validation
- `observability.test.ts` — Logging, request IDs

**Mock architecture** (`worker/src/__tests__/mocks.ts`, 9,241 lines) — 4 layers:
- **L1: Primitives** — `createMockD1()`, `createMockKV()`, `createMockR2()`, `createMockVectorize()`, `createMockAI()`
- **L2: Env Factory** — `createMockEnv()` combines all bindings
- **L3: Request Builders** — `createRequest()`, `createAuthenticatedRequest()`, `createApiKeyRequest()`
- **L4: Domain Fixtures** — `createEventFixture()`, `createEventDbRow()`

**Note:** Worker test files (`__tests__/**`, `*.test.ts`, `*.spec.ts`) are excluded from `worker/tsconfig.json` so `tsc --noEmit` only checks production code.

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `worker/src/index.ts` | ~110 | Hono app entry, routing, middleware setup |
| `worker/src/types.ts` | 627 | Backend type definitions (Cloudflare bindings, DB models) |
| `worker/src/auth/stytch.ts` | 257 | JWT validation with JWKS, `AuthResult` type, failure reasons |
| `worker/src/routes/events.ts` | 415 | Event CRUD and filtering |
| `worker/src/routes/admin.ts` | 527 | Admin operations |
| `worker/src/db/schema.sql` | 247 | D1 database schema (14 tables) |
| `worker/src/db/migrations/` | — | 5 SQL migration files |
| `src/lib/api.ts` | 687 | All frontend API client functions + 20+ types |
| `src/lib/themes.ts` | ~80 | Mineral theme definitions (Malachite, Tanzanite, Gold, Tiger's Eye, Obsidian) |
| `src/components/auth/auth-context.tsx` | 213 | Auth state management, Stytch sync |
| `src/components/auth/stytch-provider.tsx` | — | Stytch SDK initialization |
| `src/app/globals.css` | — | CSS variables, theme system |
| `src/app/stytch-overrides.css` | — | Stytch component theme overrides |
| `worker/wrangler.toml` | 241 | Cloudflare bindings and env config |

## Database

**Primary: MongoDB Atlas.** Connected via `MONGODB_URI` secret (set via `wrangler secret put MONGODB_URI`). Source of truth for all persistent data — events, users, registrations, reviews, referrals, analytics.

**Edge: Cloudflare D1 (SQLite).** Schema: `worker/src/db/schema.sql`. Migrations: `worker/src/db/migrations/`. Used for edge processing — fast reads, caching, and data that benefits from being co-located with the Worker.

14 tables: `themes`, `events` (schema.org Event, 21 columns), `users` (schema.org Person, 18 columns with roles), `registrations`, `follows`, `event_views`, `event_reviews`, `referrals`, `user_referral_codes`, `search_queries`, `ai_conversations`.

**Migrations** (5 files): `add_stytch_auth.sql`, `add_meeting_fields.sql`, `add_ticketing_fields.sql`, `add_reviews_referrals.sql`, `004_add_user_roles.sql`.

## Tech Stack

### Frontend
- Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3
- Tailwind CSS v4, tailwind-merge, clsx, lucide-react
- Stytch SDK (@stytch/nextjs 21.18.1)
- Three.js 0.182.0 (theme visualization)
- Vitest 4.0.17 with jsdom

### Backend
- Hono 4.11.9 (HTTP framework)
- Cloudflare Workers (Wrangler 4.75.0)
- @cloudflare/workers-types 4.20260117.0
- Stytch 12.43.1 (JWT validation only)
- TypeScript 5.7.2, Vitest 4.0.18

## Code Conventions

- **Brand**: Always lowercase "nhimbe" — even at sentence start
- **TypeScript strict mode** in both frontend and backend
- **Tailwind CSS v4** with `cn()` helper from `src/lib/utils.ts` for conditional classes
- **React Context** for global state (AuthProvider, ThemeProvider) — no Redux/Zustand
- **`"use client"`** directive required for interactive components
- **WCAG AAA** compliance — 7:1+ contrast ratios for primary/secondary text, 44px touch targets
- **Dark/light modes** via `.dark` and `.light` CSS classes, design tokens in `globals.css`
- **Schema.org alignment** — Events and users modeled after schema.org specs
- **Request ID tracking** — Every backend request gets a unique ID for observability
- **Path alias** — `@/*` maps to `./src/*` in frontend

## Environment Variables

Frontend (`.env.local`): `NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Backend (`worker/.dev.vars`): `API_KEY`, `MONGODB_URI`

Backend (`worker/wrangler.toml` vars): `ENVIRONMENT`, `ALLOWED_ORIGINS`, `STYTCH_PROJECT_ID` (public value for JWKS validation — different per environment)

Cloudflare bindings: `AI` (Workers AI), `VECTORIZE`, `DB` (D1), `CACHE` (KV), `MEDIA` (R2), `IMAGES`, `ANALYTICS`, `ANALYTICS_QUEUE`, `EMAIL_QUEUE`, `RATE_LIMITER`
