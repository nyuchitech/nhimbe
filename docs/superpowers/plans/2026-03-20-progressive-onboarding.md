# Progressive Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-step onboarding wizard with inline contextual prompts that collect user data at the moment it matters.

**Architecture:** Remove the onboarding gate entirely. Add a `PATCH /api/auth/profile` UPSERT endpoint on the backend. Create three small prompt components (name, location, interests) that appear inline at their trigger points. Convert the old onboarding form into a profile edit page. Replace `onboardingCompleted` with computed `profileCompleteness`.

**Tech Stack:** Next.js (App Router), React context, Cloudflare Workers (Hono), D1 (schema.org columns), Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-03-20-progressive-onboarding-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `worker/src/routes/auth.ts` | Backend auth routes — add PATCH /profile (UPSERT), remove POST /onboarding |
| `worker/src/__tests__/auth-profile.test.ts` | Backend tests for PATCH /profile |
| `src/lib/api.ts` | Frontend API client — add `updateProfile()` |
| `src/components/auth/auth-context.tsx` | Auth state — replace `onboardingCompleted`/`needsOnboarding` with `profileCompleteness` |
| `src/components/auth/auth-guard.tsx` | Simplify to auth-only gate (remove onboarding redirect) |
| `src/components/prompts/name-prompt.tsx` | Inline name collection component |
| `src/components/prompts/location-prompt.tsx` | Dismissible location banner |
| `src/components/prompts/interests-prompt.tsx` | Dismissible interests banner |
| `src/app/profile/edit/page.tsx` | Unified profile edit form (replaces onboarding wizard) |
| `src/app/events/[id]/rsvp-button.tsx` | Integrate NamePrompt before RSVP |
| `src/app/events/create/page.tsx` | Integrate NamePrompt as overlay before create form |
| `src/app/events/events-client.tsx` | Integrate LocationPrompt and InterestsPrompt |
| `src/app/profile/page.tsx` | Add completeness nudge card |

---

### Task 1: Backend — PATCH /api/auth/profile endpoint

**Files:**
- Modify: `worker/src/routes/auth.ts`
- Create: `worker/src/__tests__/auth-profile.test.ts`

**D1 column mapping:** `city` → `address_locality`, `country` → `address_country`, PK is `_id`, timestamp is `date_modified`.

- [ ] **Step 1: Write failing test for PATCH /profile UPDATE (existing user)**

In `worker/src/__tests__/auth-profile.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv, createAuthenticatedRequest } from "./mocks";

describe("PATCH /api/auth/profile", () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    env = createMockEnv();
  });

  it("updates name for existing user", async () => {
    // Seed a user row
    env.DB.prepare = vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(
          sql.includes("SELECT") ? {
            _id: "usr-1",
            email: "test@example.com",
            name: "Old Name",
            image: null,
            address_locality: null,
            address_country: null,
            interests: "[]",
            stytch_user_id: "stytch-123",
            role: "user",
            onboarding_completed: 0,
          } : null
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }));

    const request = createAuthenticatedRequest(
      "https://api.test/api/auth/profile",
      "valid-jwt-token",
      { method: "PATCH", body: JSON.stringify({ name: "New Name" }) }
    );

    const worker = (await import("../index")).default;
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.name).toBe("New Name");
  });

  it("returns 400 when no fields provided", async () => {
    const request = createAuthenticatedRequest(
      "https://api.test/api/auth/profile",
      "valid-jwt-token",
      { method: "PATCH", body: JSON.stringify({}) }
    );

    const worker = (await import("../index")).default;
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd worker && npx vitest run src/__tests__/auth-profile.test.ts`
Expected: FAIL — no PATCH route registered

- [ ] **Step 3: Implement PATCH /profile handler with UPSERT**

In `worker/src/routes/auth.ts`, ADD the PATCH handler AFTER the existing `POST /onboarding` handler (keep POST /onboarding for now — it gets removed in Task 12 after the new flow is verified):

```typescript
// PATCH /api/auth/profile — progressive profile updates (UPSERT)
auth.patch("/profile", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    console.error("Auth failed (profile):", authResult.failureReason, authResult.detail);
    return c.json({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await c.req.json() as {
    name?: string;
    city?: string;
    country?: string;
    interests?: string[];
  };

  // At least one field must be provided
  if (!body.name && !body.city && !body.country && !body.interests) {
    return c.json({ error: "At least one field is required" }, 400);
  }

  interface DbUser {
    _id: string;
    email: string;
    name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    interests: string | null;
    stytch_user_id: string | null;
    role: string | null;
    onboarding_completed: number | null;
  }

  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUser | null;

  let userId: string;

  if (existingUser) {
    userId = existingUser._id;
    // Build dynamic UPDATE with only provided fields
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) { setClauses.push("name = ?"); values.push(body.name); }
    if (body.city !== undefined) { setClauses.push("address_locality = ?"); values.push(body.city); }
    if (body.country !== undefined) { setClauses.push("address_country = ?"); values.push(body.country); }
    if (body.interests !== undefined) { setClauses.push("interests = ?"); values.push(JSON.stringify(body.interests)); }
    setClauses.push("date_modified = datetime('now')");

    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(", ")} WHERE _id = ?`
    ).bind(...values, userId).run();
  } else {
    // INSERT new user — email comes from JWT auth result
    userId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO users (
        _id, email, name, stytch_user_id,
        address_locality, address_country, interests,
        email_verified, onboarding_completed, last_login_at, date_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))
    `).bind(
      userId,
      stytchUser.email || "",
      body.name || "",
      stytchUser.userId,
      body.city || null,
      body.country || null,
      JSON.stringify(body.interests || [])
    ).run();
  }

  // Fetch updated user
  const result = await c.env.DB.prepare(
    "SELECT * FROM users WHERE _id = ?"
  ).bind(userId).first() as DbUser;

  const user = {
    id: result._id,
    email: result.email,
    name: result.name,
    avatarUrl: result.image,
    city: result.address_locality,
    country: result.address_country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: !!(result.onboarding_completed),
    stytchUserId: result.stytch_user_id,
    role: result.role || "user",
  };

  return c.json({ user });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run src/__tests__/auth-profile.test.ts`
Expected: PASS

- [ ] **Step 5: Add test for INSERT (new user) path**

Add to `auth-profile.test.ts`:

```typescript
it("inserts new user when no D1 record exists", async () => {
  env.DB.prepare = vi.fn().mockImplementation((sql: string) => ({
    bind: vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue(
        sql.includes("SELECT") && sql.includes("stytch_user_id")
          ? null // No existing user
          : sql.includes("SELECT") && sql.includes("_id")
          ? {
              _id: "new-uuid",
              email: "new@example.com",
              name: "Jane",
              image: null,
              address_locality: null,
              address_country: null,
              interests: "[]",
              stytch_user_id: "stytch-new",
              role: "user",
              onboarding_completed: 0,
            }
          : null
      ),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
  }));

  const request = createAuthenticatedRequest(
    "https://api.test/api/auth/profile",
    "valid-jwt-token",
    { method: "PATCH", body: JSON.stringify({ name: "Jane" }) }
  );

  const worker = (await import("../index")).default;
  const response = await worker.fetch(request, env, {});
  expect(response.status).toBe(200);
});
```

- [ ] **Step 6: Run all tests**

Run: `cd worker && npx vitest run`
Expected: All pass

- [ ] **Step 7: Type check**

Run: `cd worker && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 8: Commit**

```bash
git add worker/src/routes/auth.ts worker/src/__tests__/auth-profile.test.ts
git commit -m "feat: add PATCH /api/auth/profile with UPSERT for progressive onboarding"
```

---

### Task 2: Frontend API client — add `updateProfile()`

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add `updateProfile` function**

In `src/lib/api.ts`, add after the existing auth-related functions:

```typescript
export async function updateProfile(
  sessionJwt: string,
  fields: Partial<{ name: string; city: string; country: string; interests: string[] }>
): Promise<{ user: User }> {
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionJwt}`,
    },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update profile");
  }

  return response.json();
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add updateProfile() API client function"
```

---

### Task 3: Auth context — replace onboarding with profileCompleteness

**Files:**
- Modify: `src/components/auth/auth-context.tsx`
- Modify: `src/components/auth/auth-context.test.tsx`

- [ ] **Step 1: Update NhimbeUser interface and AuthContextType**

In `src/components/auth/auth-context.tsx`:

Remove `onboardingCompleted` from `NhimbeUser` interface. Keep `handle` for now (removed in Task 11 when profile page is updated). Add `profileCompleteness` to context:

```typescript
export interface NhimbeUser {
  id: string;
  email: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  interests?: string[];
  stytchUserId: string;
  role: UserRole;
}

export interface ProfileCompleteness {
  name: boolean;
  city: boolean;
  interests: boolean;
  complete: boolean;
}

interface AuthContextType {
  user: NhimbeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileCompleteness: ProfileCompleteness;
  signIn: (returnUrl?: string) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

- [ ] **Step 2: Update AuthProvider — remove needsOnboarding, add profileCompleteness**

Replace the computed values section:

```typescript
const isLoading = !isSDKReady || syncing;
const isAuthenticated = !!stytchUser && !!session && !!nhimbeUser;

const hasName = !!nhimbeUser?.name && nhimbeUser.name !== "" && nhimbeUser.name !== "User";
const hasCity = !!nhimbeUser?.city;
const hasInterests = !!nhimbeUser?.interests && nhimbeUser.interests.length > 0;

const profileCompleteness: ProfileCompleteness = {
  name: hasName,
  city: hasCity,
  interests: hasInterests,
  complete: hasName && hasCity && hasInterests,
};
```

Update the Provider value — remove `needsOnboarding`, add `profileCompleteness`.

Also update the fallback user objects (lines 102-110, 117-124) to remove `onboardingCompleted`.

- [ ] **Step 3: Update tests**

In `src/components/auth/auth-context.test.tsx`:

- Update `TestConsumer` to use `profileCompleteness` instead of `needsOnboarding`
- Update test assertions: remove `needs-onboarding` checks, add `profileCompleteness` checks
- Remove `onboardingCompleted` from all `NhimbeUser` test fixtures
- Add test: "computes profileCompleteness based on populated fields"

```typescript
it('computes profileCompleteness based on populated fields', async () => {
  const backendUser: NhimbeUser = {
    id: 'usr-1',
    email: 'test@example.com',
    name: 'Test User',
    city: 'Harare',
    stytchUserId: 'stytch-123',
    role: 'user',
  };

  // ... setup mocks, render ...

  await waitFor(() => {
    expect(screen.getByTestId('profile-name').textContent).toBe('true');
    expect(screen.getByTestId('profile-city').textContent).toBe('true');
    expect(screen.getByTestId('profile-interests').textContent).toBe('false');
    expect(screen.getByTestId('profile-complete').textContent).toBe('false');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/auth/auth-context.test.tsx`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/auth-context.tsx src/components/auth/auth-context.test.tsx
git commit -m "refactor: replace onboardingCompleted with profileCompleteness"
```

---

### Task 4: Simplify AuthGuard — auth-only gate

**Files:**
- Modify: `src/components/auth/auth-guard.tsx`
- Modify: `src/components/auth/auth-guard.test.tsx`

- [ ] **Step 1: Simplify AuthGuard**

Replace the entire `auth-guard.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Update tests**

Rewrite `auth-guard.test.tsx` — remove all onboarding-related test cases. Keep:
- Shows loading spinner when auth is loading
- Redirects to /auth/signin when not authenticated
- Renders children when authenticated
- Does not render children when not authenticated

Remove:
- All `requireOnboarding` tests
- All `needsOnboarding` redirect tests

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/components/auth/auth-guard.test.tsx`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/auth-guard.tsx src/components/auth/auth-guard.test.tsx
git commit -m "refactor: simplify AuthGuard to auth-only gate, remove onboarding redirect"
```

---

### Task 5: NamePrompt component

**Files:**
- Create: `src/components/prompts/name-prompt.tsx`

- [ ] **Step 1: Create NamePrompt component**

```typescript
"use client";

import { useState } from "react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NamePromptProps {
  onComplete: () => void;
}

export function NamePrompt({ onComplete }: NamePromptProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const stytch = useStytch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) throw new Error("No session found");

      await updateProfile(sessionJwt, { name: name.trim() });
      await refreshUser();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="text-sm font-medium text-text-secondary">
        What's your name?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 px-4 py-3 bg-surface border border-elevated rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          disabled={loading}
        />
        <Button type="submit" variant="primary" disabled={loading || name.trim().length < 2}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/components/prompts/name-prompt.tsx
git commit -m "feat: add NamePrompt inline component for contextual name collection"
```

---

### Task 6: Integrate NamePrompt into RSVP button

**Files:**
- Modify: `src/app/events/[id]/rsvp-button.tsx`

- [ ] **Step 1: Add NamePrompt to RSVPButton**

Modify `rsvp-button.tsx` — when `isAuthenticated && !user.name`, show `<NamePrompt onComplete={handleRSVP} />` instead of the RSVP button:

```typescript
// Add import at top
import { NamePrompt } from "@/components/prompts/name-prompt";

// Inside the component, after the sign-in check and before the RSVP button:
// Add state for showing name prompt
const [showNamePrompt, setShowNamePrompt] = useState(false);

// Modify the RSVP button section — if user has no name, show prompt
if (isAuthenticated && (!user?.name || user.name === "User")) {
  if (showNamePrompt) {
    return (
      <div className="space-y-2">
        <NamePrompt onComplete={handleRSVP} />
      </div>
    );
  }
  // Show RSVP button that triggers name prompt
  return (
    <Button
      variant="primary"
      className="w-full py-4 text-base"
      onClick={() => setShowNamePrompt(true)}
    >
      {price ? "Get Tickets" : "RSVP Now"}
    </Button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/app/events/[id]/rsvp-button.tsx
git commit -m "feat: integrate NamePrompt into RSVP button for nameless users"
```

---

### Task 7: Integrate NamePrompt into create event page

**Files:**
- Modify: `src/app/events/create/page.tsx`

- [ ] **Step 1: Add NamePrompt overlay to create event**

```typescript
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-context";
import { NamePrompt } from "@/components/prompts/name-prompt";
import { Skeleton } from "@/components/ui/skeleton";

const CreateEventForm = dynamic(() => import("./create-event-form"), {
  ssr: false,
  loading: () => (
    <div className="max-w-150 mx-auto px-4 pb-24 space-y-4">
      <Skeleton className="h-50 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-5 w-32 mt-2" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  ),
});

function CreateEventContent() {
  const { user } = useAuth();
  const [nameProvided, setNameProvided] = useState(false);
  const needsName = !user?.name || user.name === "User";

  if (needsName && !nameProvided) {
    return (
      <div className="max-w-100 mx-auto px-6 py-16">
        <h2 className="text-xl font-bold mb-2">Before you create an event</h2>
        <p className="text-text-secondary mb-6">We need your name so attendees know who's hosting.</p>
        <NamePrompt onComplete={() => setNameProvided(true)} />
      </div>
    );
  }

  return <CreateEventForm />;
}

export default function CreateEventPage() {
  return (
    <AuthGuard>
      <CreateEventContent />
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/app/events/create/page.tsx
git commit -m "feat: require name via NamePrompt before creating an event"
```

---

### Task 8: LocationPrompt and InterestsPrompt components

**Files:**
- Create: `src/components/prompts/location-prompt.tsx`
- Create: `src/components/prompts/interests-prompt.tsx`

- [ ] **Step 1: Create LocationPrompt**

`src/components/prompts/location-prompt.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile, getCities } from "@/lib/api";
import { Button } from "@/components/ui/button";

// sessionStorage (not localStorage) so dismissals reset per browser session — prompt reappears next visit
const DISMISS_KEY = "nhimbe_location_prompt_dismissed";

export function LocationPrompt() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const stytch = useStytch();
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [selected, setSelected] = useState<{ city: string; country: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  // Don't show if: not authenticated, already has city, or dismissed
  if (!isAuthenticated || user?.city || dismissed) return null;

  const handleSave = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) return;
      await updateProfile(sessionJwt, { city: selected.city, country: selected.country });
      await refreshUser();
    } catch {
      // Silently fail — non-blocking prompt
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <div className="bg-surface border border-elevated rounded-xl p-4 mb-4 flex items-center gap-3">
      <MapPin className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Where are you based?</p>
        <select
          className="mt-1 w-full bg-elevated rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={selected ? `${selected.city}|${selected.country}` : ""}
          onChange={(e) => {
            const [city, country] = e.target.value.split("|");
            setSelected({ city, country });
          }}
        >
          <option value="">Select a city</option>
          {cities.map((c) => (
            <option key={`${c.city}-${c.country}`} value={`${c.city}|${c.country}`}>
              {c.city}, {c.country}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={!selected || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
      </Button>
      <button onClick={handleDismiss} className="text-text-tertiary hover:text-foreground p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create InterestsPrompt**

`src/components/prompts/interests-prompt.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile, getCategories, type Category } from "@/lib/api";
import { Button } from "@/components/ui/button";

// sessionStorage (not localStorage) so dismissals reset per browser session — prompt reappears next visit
const DISMISS_KEY = "nhimbe_interests_prompt_dismissed";

export function InterestsPrompt() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const stytch = useStytch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  if (!isAuthenticated || (user?.interests && user.interests.length > 0) || dismissed) return null;

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) return;
      await updateProfile(sessionJwt, { interests: selected });
      await refreshUser();
    } catch {
      // Silently fail — non-blocking prompt
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <div className="bg-surface border border-elevated rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium">What interests you?</p>
        </div>
        <button onClick={handleDismiss} className="text-text-tertiary hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.slice(0, 12).map((cat) => (
          <button
            key={cat.id}
            onClick={() => toggleInterest(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              selected.includes(cat.id)
                ? "bg-primary text-background"
                : "bg-elevated text-foreground hover:bg-foreground/10"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={selected.length === 0 || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/components/prompts/location-prompt.tsx src/components/prompts/interests-prompt.tsx
git commit -m "feat: add LocationPrompt and InterestsPrompt dismissible banners"
```

---

### Task 9: Integrate prompts into events page

**Files:**
- Modify: `src/app/events/events-client.tsx`

- [ ] **Step 1: Add LocationPrompt and InterestsPrompt to events listing**

At the top of `events-client.tsx`, add imports:

```typescript
import { LocationPrompt } from "@/components/prompts/location-prompt";
import { InterestsPrompt } from "@/components/prompts/interests-prompt";
```

In the JSX, add both prompts above the events grid but below the search/filter bar. LocationPrompt appears first, then InterestsPrompt below the category chips.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/app/events/events-client.tsx
git commit -m "feat: add location and interests prompts to events listing page"
```

---

### Task 10: Profile edit page

**Files:**
- Create: `src/app/profile/edit/page.tsx`

- [ ] **Step 1: Create profile edit page**

Build a single-page form with all profile fields (name, city/country, interests). Uses the same data sources as the old onboarding form (`/api/cities`, `/api/categories`). Pre-populates from `useAuth().user`. Save calls `updateProfile()`. Wrap in `<AuthGuard>`.

Key patterns:
- `useAuth()` for current user data and `refreshUser()`
- `useStytch()` for session JWT
- `getCities()` and `getCategories()` for dropdown/pill data
- `updateProfile(jwt, fields)` to save
- `router.push("/profile")` after save

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/edit/page.tsx
git commit -m "feat: add profile edit page with all fields editable"
```

---

### Task 11: Profile page — completeness nudge

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Add completeness nudge card**

Import `useAuth` and access `profileCompleteness`. Above the menu sections, render a card when `!profileCompleteness.complete`:

```typescript
{!profileCompleteness.complete && (
  <Link href="/profile/edit" className="block mb-6">
    <div className="bg-surface border border-elevated rounded-xl p-4 flex items-center gap-4">
      {/* Progress ring — simple SVG circle */}
      <svg className="w-12 h-12 shrink-0" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${completionPercent}, 100`}
          className="text-primary"
        />
      </svg>
      <div>
        <p className="font-medium">Complete your profile</p>
        <p className="text-sm text-text-secondary">{nudgeText}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" />
    </div>
  </Link>
)}
```

Compute `nudgeText` from what's missing: name, location, interests.

- [ ] **Step 2: Remove `handle` references from profile display**

The `handle` field doesn't exist in the production schema. Remove any references.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: add profile completeness nudge card with progress ring"
```

---

### Task 12: Delete old onboarding files and POST /onboarding endpoint

**Files:**
- Delete: `src/app/onboarding/page.tsx`
- Delete: `src/app/onboarding/onboarding-form.tsx`
- Modify: `worker/src/routes/auth.ts` — remove `POST /onboarding` handler
- Modify: `src/components/auth/auth-context.tsx` — remove `handle` from `NhimbeUser` interface

- [ ] **Step 1: Remove POST /onboarding handler from `worker/src/routes/auth.ts`**

Delete the entire `auth.post("/onboarding", ...)` handler block.

- [ ] **Step 2: Remove `handle` from NhimbeUser interface and profile page references**

- [ ] **Step 3: Delete frontend onboarding files**

```bash
rm src/app/onboarding/page.tsx src/app/onboarding/onboarding-form.tsx
rmdir src/app/onboarding
```

- [ ] **Step 2: Verify no remaining imports**

Search for any remaining references to the old onboarding path:

```bash
grep -r "onboarding" src/ --include="*.tsx" --include="*.ts"
```

Expect: no imports of deleted files. References to `onboardingCompleted` in backend responses are OK (deprecated but still returned).

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Clean build with no broken imports

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete old onboarding wizard files"
```

---

### Task 13: Deploy and verify

- [ ] **Step 1: Deploy worker**

Run: `cd worker && npx wrangler deploy`
Expected: Successful deploy with PATCH /profile route active

- [ ] **Step 2: Run frontend build**

Run: `npm run build`
Expected: Clean

- [ ] **Step 3: Verify end-to-end**

Manual verification checklist:
1. Sign in with Stytch → lands on home page (no onboarding redirect)
2. View event → tap RSVP → NamePrompt appears → enter name → RSVP fires
3. Browse events page → LocationPrompt banner shows → set city → banner disappears
4. Category filter → InterestsPrompt shows → select interests → saves
5. Visit /profile → completeness nudge shows if incomplete → link to /profile/edit works
6. Visit /profile/edit → all fields editable → save works
7. Visit /onboarding → 404 (route removed)

- [ ] **Step 4: Commit any fixes and final push**
