# Progressive Onboarding Design

> Replaces the 3-step onboarding wizard with contextual, inline prompts that collect user data at the moment it becomes useful.

## Problem

The current onboarding flow gates users behind a 3-step wizard (name, city, interests) before they can use the app. This creates unnecessary friction — users must complete onboarding before seeing a single event. The data collected (city, interests) isn't currently used for discovery or recommendations, making the gate feel arbitrary.

Additionally:
- Users who skip onboarding are stuck forever (`/profile/edit` doesn't exist)
- `onboardingCompleted` gates access to protected pages via `AuthGuard`
- Profile page is read-only with no edit capability

## Design Principles

- **Collect data when it earns its place.** Don't ask for information until the moment it actually matters.
- **Never block the primary action.** Authentication gets you in. Everything else is progressive.
- **One endpoint, partial updates.** All profile changes go through `PATCH /api/auth/profile`.

## New Auth Flow

```
/auth/signin -> /authenticate -> / (home, immediately)
```

No redirects to `/onboarding`. No gates. User lands on the home page and browses events like any other visitor. `AuthGuard` gates only on authentication — the `requireOnboarding` prop and `needsOnboarding` redirect are removed entirely.

## Prompt Components

Three inline prompt components, each triggered contextually. All call the same `PATCH /api/auth/profile` endpoint with partial updates and refresh the auth context on success.

### NamePrompt

- **Trigger:** User taps RSVP/Get Tickets and has no `user.name`. Also triggers when creating an event.
- **Placement:** Replaces the RSVP button area temporarily — same card, same position.
- **UI:** Text input ("What's your name?") + "Continue" button. Compact, single line.
- **Behavior:** On submit -> await PATCH profile with `{ name }` -> await `refreshUser()` -> then fire the RSVP action. If PATCH fails, show inline error and do NOT proceed with RSVP. User never leaves the event page.
- **On create event:** Show NamePrompt as a blocking overlay before rendering the create form (not inline within the form).

### LocationPrompt

- **Trigger:** User first opens the Discover/Search page.
- **Placement:** Dismissible banner at the top of the events list.
- **UI:** "Where are you based?" + city dropdown + "Set Location" button + dismiss X. The `/api/cities` endpoint returns `{ city, country }` objects — selecting a city auto-populates the country.
- **Behavior:** On submit -> PATCH profile with `{ city, country }` (both from the selected city object) -> banner disappears. On dismiss -> don't show again this session (localStorage). Reappears next session if still empty.
- **Non-blocking:** User can scroll past and browse events without setting location.

### InterestsPrompt

- **Trigger:** User first browses the category filter or explore section.
- **Placement:** Dismissible banner/card below the category filter bar.
- **UI:** "Pick some interests for personalized recommendations" + category pills + "Save" button + dismiss X.
- **Behavior:** Same dismiss/reappear pattern as LocationPrompt.
- **Non-blocking:** Events still show without interests set.

### Shared behavior

- All prompts shown at most once per session if dismissed (localStorage keyed by prompt name).
- Never shown if the field is already populated.
- Each prompt updates auth context via `refreshUser()` after successful save.

## Profile Edit Page

The old 3-step onboarding wizard is converted into a single-page edit form at `/profile/edit`:

- All fields visible at once: name, city/country selector, interests pills.
- All fields optional to save — user can update just one field at a time.
- Pre-populated from current user data in auth context.
- Same data sources: cities from `/api/cities`, categories from `/api/categories`.
- Save calls `PATCH /api/auth/profile` with changed fields only.

## Profile Completeness

Replaces the binary `onboardingCompleted` flag with a computed `profileCompleteness` object:

```typescript
profileCompleteness: {
  name: boolean;      // user.name is set
  city: boolean;      // user.city is set
  interests: boolean; // user.interests.length > 0
  complete: boolean;  // all three are true
}
```

- Computed client-side from the user object — no new database field needed.
- `onboardingCompleted` column remains in D1/Supabase but is no longer read by the frontend. The `NhimbeUser` interface removes the field; `profileCompleteness` replaces it. Backend endpoints continue returning it for backward compatibility but it is deprecated.

### Profile page nudge

If `profileCompleteness.complete` is false, the profile page shows a card at the top:
- Progress ring visual (no percentage number)
- Plain-language prompt: "Add your location for better event recommendations"
- Link to `/profile/edit`
- Disappears when all fields are populated

## API Changes

### New: PATCH /api/auth/profile

```
PATCH /api/auth/profile
Authorization: Bearer <session_jwt>
Body: { name?, city?, country?, interests? }
Response: { user: UserObject }
```

- Validates JWT via `getAuthenticatedUser()`
- **UPSERT behavior:** If no user row exists for the authenticated `stytch_user_id`, INSERT a new row using the user's email and stytch_user_id from the auth result plus the provided fields. If a row exists, UPDATE only the fields present in the request body.
- Returns the full updated user object

#### D1 column mapping

The request body uses frontend-friendly names. The handler maps them to schema.org D1 columns:

| Request field | D1 column |
|--------------|-----------|
| `name` | `name` |
| `city` | `address_locality` |
| `country` | `address_country` |
| `interests` | `interests` (JSON string) |

Primary key is `_id` (not `id`). Timestamp column is `date_modified` (not `updated_at`).

### Removed: POST /api/auth/onboarding

Replaced entirely by `PATCH /api/auth/profile`.

### Unchanged

- `POST /api/auth/sync` — still creates user record on first sign-in, returns user object (still includes `onboardingCompleted` for backward compat but frontend ignores it)
- `GET /api/auth/me` — still returns current user (same deprecation note)

### Data layer note

The PATCH handler writes to D1 (current). When the Supabase migration completes, this handler will be updated to write to Supabase with D1 as edge cache. No dual-write is needed in this phase.

### Schema note

The D1 `users` table in production uses schema.org column names (`_id`, `address_locality`, `address_country`, `date_modified`). The `worker/src/db/schema.sql` file is out of date and should not be used as reference. Follow the patterns in `worker/src/routes/auth.ts`.

### Frontend API client

- New: `updateProfile(fields: Partial<{ name, city, country, interests }>)` in `src/lib/api.ts`
- Removed: inline `completeOnboarding()` from old onboarding form

## Files Changed

### Deleted

| File | Reason |
|------|--------|
| `src/app/onboarding/page.tsx` | No more onboarding route |
| `src/app/onboarding/onboarding-form.tsx` | Replaced by profile edit + prompt components |

### Created

| File | Purpose |
|------|---------|
| `src/components/prompts/name-prompt.tsx` | Inline name collection at RSVP / create event |
| `src/components/prompts/location-prompt.tsx` | Dismissible banner on discover/search page |
| `src/components/prompts/interests-prompt.tsx` | Dismissible banner on category browse |
| `src/app/profile/edit/page.tsx` | Unified profile edit form (all fields, single page) |

### Modified

| File | Change |
|------|--------|
| `src/components/auth/auth-context.tsx` | Remove `needsOnboarding`, `onboardingCompleted`. Add `profileCompleteness` computed value. |
| `src/components/auth/auth-guard.tsx` | Remove `requireOnboarding` prop and onboarding redirect. Auth-only gate. |
| `src/components/auth/auth-guard.test.tsx` | Update tests: remove onboarding redirect cases, add auth-only cases. |
| `src/components/auth/auth-context.test.tsx` | Update tests for `profileCompleteness`. |
| `src/app/events/[id]/rsvp-button.tsx` | Integrate `<NamePrompt />` when user has no name. |
| `src/app/events/create/page.tsx` | Integrate `<NamePrompt />` when creating event without name. |
| `src/app/profile/page.tsx` | Add completeness nudge card, link to `/profile/edit`. |
| `src/lib/api.ts` | Add `updateProfile()` function. |
| `worker/src/routes/auth.ts` | Remove `POST /onboarding`, add `PATCH /profile` handler. |

### Unchanged

| File | Reason |
|------|--------|
| `src/app/authenticate/page.tsx` | Stytch callback flow unchanged |
| `src/app/auth/signin/page.tsx` | Sign-in UI unchanged |
| `src/components/auth/stytch-provider.tsx` | SDK initialization unchanged |
