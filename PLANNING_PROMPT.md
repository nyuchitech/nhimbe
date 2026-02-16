# nhimbe — Enterprise-Grade Test & Infrastructure Planning Prompt

> Use this prompt to send an AI assistant into planning mode to analyze, plan, implement, and document comprehensive test coverage and infrastructure hardening for the nhimbe platform.

---

## The Prompt

You are tasked with building enterprise-grade test coverage and infrastructure resilience for **nhimbe**, a community events platform (Next.js 16 frontend + Cloudflare Workers backend). The goal is to replicate the stability and architecture patterns of TikTok (resilience/circuit breakers), Netflix (observability/chaos engineering), and Claude (AI layer testing/safety guardrails).

### Context

nhimbe is a full-stack monorepo:
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, deployed on Vercel
- **Backend:** Cloudflare Workers (TypeScript) with D1 (SQLite), KV, R2, Vectorize, Workers AI
- **Auth:** Stytch Consumer SDK (magic links, OTP, session JWTs validated via JWKS)
- **AI Features:** RAG semantic search, AI chat assistant (Shamwari), vector embeddings, AI description generator
- **Database:** 10+ tables (events, users, registrations, reviews, referrals, analytics)

Read `CLAUDE.md` for full project structure, tech stack, and conventions before proceeding.

### Requirements

Analyze the codebase and create a comprehensive plan covering ALL of the following areas:

#### 1. Test Architecture (Tiered System)

Design a layered test architecture inspired by enterprise patterns:

- **Layer 1 — Mock Primitives:** Create mock factories for every Cloudflare binding (D1, KV, R2, Vectorize, Workers AI, Analytics Engine, Queue, Rate Limiter, Images). Each mock must faithfully simulate the binding's API surface.
- **Layer 2 — Environment Factory:** A `createMockEnv()` that assembles all bindings into a complete `Env` object matching `wrangler.toml` bindings.
- **Layer 3 — Request Builders:** Factory functions for HTTP requests: `createRequest()`, `createAuthenticatedRequest()` (with valid JWT claims), `createApiKeyRequest()`.
- **Layer 4 — Domain Fixtures:** Business object factories for events, users, registrations, reviews, host stats, referral codes — matching the D1 schema exactly.

#### 2. Backend Test Suites

Plan test suites for every backend concern:

- **Authentication & Authorization:** JWT verification (RS256), bearer token extraction, JWKS cache (TTL, force refresh), claim validation (exp, nbf, iss, aud), session lifecycle
- **RBAC:** Role hierarchy (user < moderator < admin < super_admin), `hasPermission()` function, route-level authorization guards
- **Input Validation:** All sanitization functions (XSS stripping, SQL injection prevention), data transformation (slugify, getInitials, generateShortCode, generateReferralCode, dbRowToEvent), date parsing, query parameter building
- **Security:** CORS origin validation, API key verification, content security headers, XSS payload rejection, SQL injection prevention
- **AI Layers:** Embedding generation (input validation, dimension verification, error handling), RAG search pipeline (query → embed → vectorize → D1 → LLM summary), AI assistant (intent detection, context building, conversation history), description generator (wizard steps, category-specific prompts, output validation)
- **Observability:** Analytics event pipeline, rate limiting logic, KV cache patterns (TTL, serialization, miss handling), error tracking, circuit breaker patterns for AI feature degradation

#### 3. Frontend Test Suites

Plan test suites for every frontend concern:

- **API Client (`src/lib/api.ts`):** Every exported function (40+), error handling (throws vs silent null), query parameter construction, media URL building, request shapes (method, headers, body)
- **Utilities:** `timezone.ts` (date formatting, weather icons, timezone detection), `calendar.ts` (ICS generation, Google/Outlook/Yahoo Calendar URLs, date parsing), `utils.ts` (cn() class merging)
- **Auth Components:** AuthContext (Stytch SDK integration — must mock `@stytch/nextjs`), AuthGuard (route protection, redirect behavior, loading states)
- **Accessibility (WCAG 2.2):** Contrast ratio verification using luminance calculations (AAA 7:1 for primary/secondary text, AA 4.5:1 for tertiary/accent), touch target sizes (44px minimum), semantic HTML validation, keyboard navigation standards
- **SEO:** Metadata validation, Open Graph tags, Twitter Cards, robots configuration, brand consistency (lowercase "nhimbe", consistent tagline), canonical URLs

#### 4. Infrastructure Resilience Patterns

Plan tests that verify production resilience:

- **Circuit Breakers (TikTok pattern):** AI features degrade gracefully when Workers AI is unavailable, analytics tracking never throws (fire-and-forget), batch error collection with threshold alerts
- **Observability (Netflix pattern):** Structured logging for every API endpoint, request tracing through the full stack, error rate monitoring, latency tracking
- **AI Safety (Claude pattern):** Input sanitization before LLM calls, output validation (no hallucinated URLs, no PII leakage), token limit enforcement, graceful fallbacks when AI is unavailable

#### 5. Design Token Consolidation

Ensure zero duplicated color/theme definitions:

- All mineral theme colors (malachite, tanzanite, gold, tiger's eye, obsidian) must be defined in ONE shared constants file
- All consumers (event-theme-wrapper, create page, gradient-background, OG image generation) must import from the shared source
- Brand colors for light/dark modes must be centralized
- Inline styles are acceptable ONLY for: dynamic runtime values (CSS variables, calculated widths), Next.js ImageResponse (Satori requires inline styles), third-party component overrides (Stytch SDK)

#### 6. CI Pipeline

Plan the CI pipeline to run all tests:

- Frontend tests run on every push and PR
- Backend tests run on every push and PR (separate job)
- Both must pass before merge
- Cache node_modules for performance

#### 7. Documentation

Keep `CLAUDE.md` updated with:

- Test commands (frontend and backend)
- Test architecture explanation (4-layer system)
- Test suite inventory (file, test count, coverage area)
- Instructions for writing new tests
- Design token location and usage

### Constraints

- **Vitest** is the test framework for both frontend and backend
- **No external state libraries** — React Context only
- **No CSS-in-JS libraries** — Tailwind + CSS custom properties only
- **Cloudflare Workers** environment (no Node.js APIs like `fs`, `path` in backend)
- All tests must be **deterministic** (no flaky tests, mock all external dependencies)
- Tests must run in under 30 seconds total per suite
- **WCAG 2.2** compliance is mandatory (AAA for primary text, AA for accents)

### Deliverables

For each area above, provide:

1. **File locations** — exactly where each test file should live
2. **Test count estimates** — expected number of test cases per suite
3. **Mock strategy** — what needs to be mocked and how
4. **Priority order** — which tests to write first (P0 = blocks deployment, P4 = nice to have)
5. **Risk assessment** — what breaks if these tests don't exist

### Priority Order

| Priority | Area | Rationale |
|----------|------|-----------|
| P0 | CI pipeline integration | Tests that don't run in CI don't exist |
| P1 | Frontend utilities (api.ts, timezone, calendar) | Core business logic, highest change frequency |
| P2 | Backend auth, validation, security | Security-critical, must not regress |
| P3 | AI layer tests | Complex integration points, hardest to debug |
| P4 | Accessibility, SEO, observability | Quality assurance, brand consistency |

---

*Analyze the full codebase, then produce a step-by-step implementation plan. Do not start implementing until the plan is reviewed and approved.*
