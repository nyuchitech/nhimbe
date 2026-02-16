# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) — community events discovery and management platform, part of the Mukoko ecosystem. Full-stack monorepo: Next.js 16 frontend (Vercel) + Cloudflare Workers backend (D1, Vectorize, Workers AI, R2, KV).

## Build & Dev Commands

```bash
# Frontend (root directory)
npm install && npm run dev          # Dev server at http://localhost:3000
npm run build                       # Production build (Next.js)
npm run lint                        # ESLint

# Backend (worker/ directory)
cd worker && npm install && npm run dev   # Dev server at http://localhost:8787
cd worker && npm run deploy               # Deploy to Cloudflare
cd worker && npx tsc --noEmit             # Type check worker

# Tests (Vitest for both)
npx vitest run                      # Frontend tests (from root)
npx vitest run src/lib/api.test.ts  # Single frontend test file
cd worker && npx vitest run         # Backend tests
cd worker && npx vitest run src/__tests__/auth.test.ts  # Single backend test file

# Database migrations
cd worker && wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/your-migration.sql
```

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs 5 parallel jobs on every push:
1. **Lint & Build** — `npm run lint` + `npm run build`
2. **Frontend Tests** — `npm run test:run` (162 tests)
3. **Worker Tests** — `cd worker && npx vitest run` (171 tests)
4. **Worker Type Check** — `cd worker && npx tsc --noEmit`
5. **Validate Migrations** — checks migration SQL files exist and are non-empty

All 5 must pass. The build uses placeholder env vars so `NEXT_PUBLIC_*` values don't need real secrets.

## Architecture

### Frontend → Backend Communication

All frontend API calls go through `src/lib/api.ts` (centralized client) → Cloudflare Worker at `NEXT_PUBLIC_API_URL`.

### Backend Routing

`worker/src/index.ts` is a single large file (~2800 lines) with URL-based routing in the main `fetch` handler. Pattern:
```
if (url.pathname === "/api/events" && request.method === "GET") {
  return handleGetEvents(request, env);
}
```
Handler functions are defined in the same file.

### Authentication Flow

1. Frontend uses **Stytch Consumer SDK** (magic links + OTP) — session managed client-side
2. On login, `AuthProvider` (`src/components/auth/auth-context.tsx`) calls `/api/auth/sync` with the Stytch session JWT
3. Backend validates JWT locally using Stytch's JWKS endpoint (`worker/src/auth/stytch.ts`) — no Stytch API secret needed
4. `getAuthenticatedUser()` returns `AuthResult` with structured failure reasons (e.g., `token_expired`, `issuer_mismatch`)
5. If `/api/auth/sync` fails, `AuthProvider` has a fallback that creates a temporary user object — this can mask JWT validation failures

### Write Operation Authorization

Protected endpoints use either:
- **JWT auth** via `getAuthenticatedUser()` for user-specific operations (onboarding, profile)
- **Origin check** via `isAllowedOrigin()` OR **API key** via `X-API-Key` header for write operations (create/update events, registrations)

### AI Features

- **RAG Search** (`worker/src/ai/search.ts`): BGE-base-en-v1.5 embeddings → Cloudflare Vectorize → Llama 3.1 8B summaries
- **AI Assistant** (`worker/src/ai/assistant.ts`): "Shamwari" chat interface
- **Description Wizard** (`worker/src/ai/description-generator.ts`): Qwen 3 30B generation

## Testing

### Backend Test Mocks (`worker/src/__tests__/mocks.ts`)

4-layer mock architecture:
- **L1: Primitives** — `createMockD1()`, `createMockKV()`, `createMockR2()`, `createMockAI()`
- **L2: Env Factory** — `createMockEnv()` combines all bindings
- **L3: Request Builders** — `createRequest()`, `createAuthenticatedRequest()`
- **L4: Domain Fixtures** — `createEventFixture()`, `createUserFixture()`

All backend tests use these shared mocks. Frontend tests live alongside modules (e.g., `src/lib/api.test.ts`) or in `src/__tests__/`.

**Note:** Worker test files (`__tests__/**`, `*.test.ts`, `*.spec.ts`) are excluded from `worker/tsconfig.json` so `tsc --noEmit` only checks production code. Test types are provided by vitest's `globals: true` setting in `worker/vitest.config.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | All backend API routes and handlers |
| `worker/src/auth/stytch.ts` | JWT validation with JWKS, `AuthResult` type |
| `worker/src/types.ts` | Backend TypeScript type definitions |
| `worker/src/db/schema.sql` | D1 database schema |
| `src/lib/api.ts` | All frontend API client functions |
| `src/lib/themes.ts` | Mineral theme definitions (`brandColors`, `mineralThemes`) |
| `src/components/auth/auth-context.tsx` | Auth state management, Stytch sync |
| `src/app/globals.css` | CSS variables, theme system |
| `worker/wrangler.toml` | Cloudflare bindings and env config |

## Database

Cloudflare D1 (SQLite). Core tables: `events`, `users`, `registrations`, `follows`, `themes`. Analytics: `event_views`, `search_queries`, `ai_conversations`. Schema in `worker/src/db/schema.sql`, migrations in `worker/src/db/migrations/`.

## Code Conventions

- **Brand**: Always lowercase "nhimbe" — even at sentence start
- **TypeScript strict mode** in both frontend and backend
- **Tailwind CSS v4** with `cn()` helper from `src/lib/utils.ts` for conditional classes
- **React Context** for global state (AuthProvider, ThemeProvider) — no Redux/Zustand
- **`"use client"`** directive required for interactive components
- **WCAG AAA** compliance — 7:1+ contrast ratios for primary/secondary text, 44px touch targets
- **Dark/light modes** via `.dark` and `.light` CSS classes, design tokens in `globals.css`

## Environment Variables

Frontend (`.env.local`): `NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Backend (`worker/.dev.vars`): `API_KEY`, `STYTCH_PROJECT_ID` (also set in `wrangler.toml` vars)

Cloudflare bindings: `AI` (Workers AI), `VECTORIZE`, `DB` (D1), `CACHE` (KV), `MEDIA` (R2), `IMAGES`, `ANALYTICS`
