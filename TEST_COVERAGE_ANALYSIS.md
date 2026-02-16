# nhimbe Test Coverage Analysis

> Analysis date: 2026-02-15

## Current State

### Infrastructure

| Aspect | Frontend (`src/`) | Backend (`worker/`) |
|--------|-------------------|---------------------|
| Framework | Vitest 4.x + React Testing Library | **None** |
| Config | `vitest.config.ts` | N/A |
| Setup file | `src/__tests__/setup.ts` | N/A |
| Test scripts | `test`, `test:run`, `test:coverage` | N/A |
| Dependencies | vitest, @testing-library/react, jsdom | N/A |

### Existing Tests

| File | Tests | Status |
|------|-------|--------|
| `src/components/auth/auth-context.test.tsx` | 9 tests | **All failing** - Stytch SDK not mocked; `useStytchUser` throws outside `<StytchProvider>` |
| `src/components/auth/auth-guard.test.tsx` | 7 tests | 6 passing, 1 intentionally failing (documents a bug) |

**Passing: 8 / 17 total (47%)**

The `auth-context.test.tsx` failures are a mocking gap: the tests render `<AuthProvider>` which calls `useStytchUser()` internally, but Stytch is not mocked. This needs to be fixed before any other auth tests can be added.

### CI Pipeline (`.github/workflows/ci.yml`)

The CI pipeline runs lint, build, worker type-check, and migration validation -- but **does not run tests**. This means test regressions are invisible.

### Estimated Code Coverage

| Area | Files | Lines (approx.) | Test Coverage |
|------|-------|------------------|---------------|
| Auth components | 2 | ~250 | Partial (~40%) |
| Frontend utilities (`src/lib/`) | 4 | ~1,000 | **0%** |
| UI components (`src/components/ui/`) | ~15 | ~3,000 | **0%** |
| Page components (`src/app/`) | ~15 | ~3,500 | **0%** |
| Backend router + handlers (`worker/src/index.ts`) | 1 | ~3,350 | **0%** |
| Backend auth (`worker/src/auth/`) | 1 | ~190 | **0%** |
| Backend AI (`worker/src/ai/`) | 4 | ~840 | **0%** |
| Backend types (`worker/src/types.ts`) | 1 | ~615 | **0%** |

**Overall estimated coverage: <2%**

---

## Priority Recommendations

### P0 -- Fix Existing Tests and CI

These are blockers that should be addressed first.

#### 1. Fix `auth-context.test.tsx` Stytch mock

All 9 tests fail because `useStytchUser` is called outside `<StytchProvider>`. The test file needs to mock the `@stytch/nextjs` module:

```typescript
vi.mock('@stytch/nextjs', () => ({
  useStytchUser: () => ({ user: null, isInitialized: true }),
  useStytchSession: () => ({ session: null, isInitialized: true }),
  useStytch: () => ({ session: { revoke: vi.fn() } }),
}));
```

**File:** `src/components/auth/auth-context.test.tsx`

#### 2. Fix the AuthGuard redirect bug documented in tests

The failing test at `auth-guard.test.tsx:151` documents a real bug: when `isAuthenticated=false` and `needsOnboarding=true`, the guard redirects to `/onboarding` instead of `/auth/signin`. Unauthenticated users should always go to sign-in regardless of onboarding state.

**File:** `src/components/auth/auth-guard.tsx`

#### 3. Add test execution to CI pipeline

```yaml
# Add to .github/workflows/ci.yml
test:
  name: Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    - run: npm ci
    - run: npm run test:run
```

---

### P1 -- Frontend Unit Tests (High Value, Low Effort)

Pure functions and utilities are the easiest to test and cover critical business logic.

#### 4. `src/lib/api.ts` (~662 lines) -- API client

The centralized API client with 40+ functions is the single most impactful file to test.

**What to test:**
- `apiFetch()` wrapper: error handling, JSON parsing, HTTP status codes
- Query parameter construction in `getEvents()`, search functions
- File upload validation in `uploadMedia()` (type/size constraints)
- Error propagation vs. silent `null` returns (inconsistent pattern)
- `getMediaUrl()` query parameter building for image transforms

**Why:** Every page depends on this. A broken `apiFetch()` breaks everything.

#### 5. `src/lib/timezone.ts` (~144 lines) -- Date/time utilities

**What to test:**
- `getRelativeDate()` -- boundary conditions around midnight, "Today" vs "Tomorrow"
- `formatEventDateTime()` -- parsing ISO dates + time strings with AM/PM
- `getUserTimezone()` -- UTC offset calculation
- `getWeather()` -- external API failure handling

**Why:** Date bugs are subtle and affect event display across the entire app.

#### 6. `src/lib/calendar.ts` (~196 lines) -- Calendar integration

**What to test:**
- ICS file format compliance (CRLF line endings, special character escaping)
- Google/Outlook/Yahoo URL parameter encoding
- Date format conversion (each platform uses a different format)
- End time calculation from start + duration

**Why:** Calendar export is user-facing and format errors cause silent failures (events show up wrong on user calendars).

#### 7. `src/lib/utils.ts` (~7 lines) -- `cn()` class merging

Quick sanity test for Tailwind class merging behavior. Low effort, low risk.

---

### P2 -- Backend Unit Tests (High Value, Medium Effort)

The backend has zero test infrastructure. Setting it up requires adding Vitest to `worker/` and mocking Cloudflare bindings (D1, KV, Vectorize, etc.).

#### 8. Set up backend test infrastructure

Add to `worker/package.json`:
```json
{
  "devDependencies": {
    "vitest": "^4.0.17",
    "@cloudflare/vitest-pool-workers": "^0.8.0"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

Create `worker/vitest.config.ts` with the Cloudflare Workers pool for realistic D1/KV testing.

#### 9. `worker/src/auth/stytch.ts` (~192 lines) -- JWT verification

**What to test:**
- `verifyJWT()` -- valid tokens, expired tokens, wrong issuer, wrong audience
- `base64urlDecode()` -- padding edge cases, invalid input
- `extractBearerToken()` -- missing header, malformed header, correct extraction
- JWKS cache behavior: fresh fetch, cache hit, cache invalidation on key rotation
- Token forgery detection (modified payload, wrong signature)

**Why:** Auth bypass is the highest-severity vulnerability class. This code is the security boundary for every protected endpoint.

#### 10. `worker/src/index.ts` -- Input validation utilities (lines 36-61)

**What to test:**
- `safeParseInt()` -- valid ints, floats, strings, negative numbers, bounds
- `validateRequiredFields()` -- missing fields, empty strings, null values
- `safeParseJSON()` -- valid JSON, malformed JSON, empty string
- `isAllowedOrigin()` -- localhost variants, trusted domains, subdomain matching, attack strings

**Why:** These gate all user input. Failures here lead to crashes or security issues.

#### 11. `worker/src/index.ts` -- Data transformation utilities

**What to test:**
- `dbRowToEvent()` -- null handling, boolean coercion, JSON parse failures, date formats
- `slugify()` -- special characters, unicode, empty strings, collision avoidance
- `generateShortCode()` / `generateId()` -- format correctness, length
- `generateHandle()` -- name edge cases (single name, empty, special characters)
- `getInitials()` -- multi-word names, single names, empty

**Why:** Data transformation bugs cause corrupted display or broken lookups.

#### 12. `worker/src/index.ts` -- Registration/capacity logic (lines 1438-1611)

**What to test:**
- Capacity checking (at limit, over limit, unlimited)
- Duplicate registration prevention
- Status transitions (pending -> registered -> attended, etc.)
- Attendee count increment/decrement consistency
- Self-registration prevention (host can't RSVP to own event)

**Why:** Registration bugs directly impact users and event hosts. Capacity overflow is a real business problem.

#### 13. `worker/src/index.ts` -- CORS and authorization (lines 70-100)

**What to test:**
- `validateApiKey()` -- correct key, wrong key, missing key
- `isAllowedOrigin()` -- exact match, subdomain match, no match, null origin
- Role hierarchy: `hasPermission()` for user < moderator < admin < super_admin

**Why:** Authorization bugs = security vulnerabilities.

---

### P3 -- Backend AI Feature Tests (Medium Value, Higher Effort)

AI features are harder to test because they depend on LLM responses, but the surrounding logic can be unit-tested.

#### 14. `worker/src/ai/search.ts` (~210 lines)

**What to test:**
- Filter construction for Vectorize queries (city, category combinations)
- Vector result -> DB fetch mapping
- Empty result handling
- `findSimilarEvents()` self-exclusion logic

#### 15. `worker/src/ai/assistant.ts` (~231 lines)

**What to test:**
- `detectIntent()` -- JSON extraction regex, keyword fallback, malformed LLM responses
- Conversation history assembly order
- Context injection (user location, interests)

#### 16. `worker/src/ai/embeddings.ts` (~141 lines)

**What to test:**
- `eventToSearchText()` -- null field filtering, multi-field concatenation
- Batch chunking logic (10-item chunks, boundary conditions)
- Partial failure handling in `indexEvents()`

#### 17. `worker/src/ai/description-generator.ts` (~255 lines)

**What to test:**
- `getWizardSteps()` -- category-specific step generation
- Prompt construction (user input escaping)
- Fallback description generation

---

### P4 -- Frontend Component & Integration Tests (Medium Value, Higher Effort)

#### 18. Event creation form (`src/app/events/create/page.tsx`, ~1001 lines)

The most complex page in the app. Key test areas:
- Form validation (all required fields)
- File upload constraints (type, size limit of 5MB)
- Date serialization with timezone offset
- Category/tag management
- Event data transformation before API submission

#### 19. Event filtering (`src/app/events/page.tsx`, ~244 lines)

- Combined filter logic (search + category + city)
- Case-insensitive search across title, description, tags
- Filter count tracking
- Empty state handling

#### 20. AI Description Wizard (`src/components/ui/ai-description-wizard.tsx`)

- Step navigation (prev/next)
- Input validation per step
- API call construction
- Regeneration with feedback

---

### P5 -- E2E Tests (High Value, Highest Effort)

Not recommended immediately, but the critical user flows that would benefit from Playwright E2E tests:

1. **Sign in -> browse events -> RSVP** (core happy path)
2. **Create event flow** (form submission with all fields)
3. **Search -> event detail -> calendar export**
4. **Onboarding flow** (new user first experience)

---

## Summary

| Priority | Area | Effort | Impact | Files |
|----------|------|--------|--------|-------|
| **P0** | Fix broken tests + add tests to CI | Low | High | 3 files |
| **P1** | Frontend utility unit tests | Low | High | `api.ts`, `timezone.ts`, `calendar.ts` |
| **P2** | Backend test setup + core logic | Medium | Very High | `stytch.ts`, `index.ts` (validation, transforms, auth) |
| **P3** | Backend AI feature tests | Medium | Medium | `search.ts`, `assistant.ts`, `embeddings.ts` |
| **P4** | Frontend component tests | Medium-High | Medium | Event create, event browse, AI wizard |
| **P5** | E2E tests (Playwright) | High | High | Cross-cutting user flows |

### Known Bugs Found During Analysis

1. **AuthGuard redirect logic** (`src/components/auth/auth-guard.tsx`): Unauthenticated users with `needsOnboarding=true` are sent to `/onboarding` instead of `/auth/signin`. The condition should check `!isAuthenticated` first, before checking onboarding.

2. **auth-context.test.tsx missing Stytch mock**: All 9 tests fail because `@stytch/nextjs` hooks are not mocked, causing `useStytchUser` to throw.

### Quick Wins

The highest ROI starting point is:
1. Fix the two broken test issues (P0)
2. Add `npm run test:run` to CI (P0)
3. Write tests for `src/lib/api.ts`, `timezone.ts`, `calendar.ts` (P1)
4. Set up `worker/` test infrastructure and test `stytch.ts` + input validation (P2)

This would take coverage from <2% to an estimated 15-25% while covering the most critical code paths.
