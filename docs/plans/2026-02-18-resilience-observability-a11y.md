# Resilience, Observability & Accessibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the nhimbe app crash-resilient (no single component breaks the site), add worker observability, and close accessibility gaps.

**Architecture:** Next.js error boundaries at every route segment + component-level `<WidgetErrorBoundary>`. Worker gets Hono middleware for request tracing, structured logging, and rate limiting. Accessibility gets focus traps, live regions, and ARIA completeness.

**Tech Stack:** Next.js 16 (App Router error/loading conventions), Hono middleware, React class components (error boundaries), `useFocusTrap` hook.

**Branch:** Create `feature/resilience-a11y` from current `feature/hono-migration` HEAD.

---

### Task 1: Create feature branch and ErrorBoundary components

**Files:**
- Create: `src/components/error/error-boundary.tsx`
- Create: `src/components/error/widget-error-boundary.tsx`

**Step 1: Create the feature branch**

```bash
git checkout -b feature/resilience-a11y
```

**Step 2: Create `src/components/error/error-boundary.tsx`**

This is a React class component (required for error boundaries). Two exports: `AppShellBoundary` (wraps providers, shows degraded shell on crash) and a generic `ErrorBoundary`.

```tsx
"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

**Step 3: Create `src/components/error/widget-error-boundary.tsx`**

Lightweight wrapper for non-critical widgets — shows a small error card or nothing.

```tsx
"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error(`Widget "${this.props.name || "unknown"}" crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 rounded-xl bg-surface border border-elevated text-center text-sm text-text-secondary">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-text-tertiary" />
          <p>Something went wrong</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit` (from root — frontend tsc)
Expected: PASS (no errors related to new files)

**Step 5: Commit**

```bash
git add src/components/error/
git commit -m "feat: add ErrorBoundary and WidgetErrorBoundary components"
```

---

### Task 2: Create Skeleton component and loading.tsx files

**Files:**
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/app/events/loading.tsx`
- Create: `src/app/events/[id]/loading.tsx`
- Create: `src/app/events/create/loading.tsx`
- Create: `src/app/search/loading.tsx`
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/calendar/loading.tsx`

**Step 1: Create `src/components/ui/skeleton.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface-elevated", className)} />
  );
}
```

Note: Check if `bg-surface-elevated` exists in globals.css. If not, use `bg-elevated`.

**Step 2: Create root `src/app/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-300 mx-auto px-6 py-12">
      <Skeleton className="h-10 w-48 mb-6" />
      <Skeleton className="h-6 w-96 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Create `src/app/events/loading.tsx`**

Same card-grid skeleton as root loading (events list layout).

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="max-w-300 mx-auto px-6 py-12">
      <Skeleton className="h-10 w-40 mb-4" />
      <Skeleton className="h-12 w-full mb-6 rounded-xl" />
      <div className="flex gap-3 mb-8 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Create `src/app/events/[id]/loading.tsx`**

Event detail skeleton — cover image, title, details sidebar.

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <div className="max-w-300 mx-auto px-6 py-8">
      <Skeleton className="h-64 md:h-96 w-full rounded-2xl mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Create remaining loading files**

- `src/app/events/create/loading.tsx` — form skeleton (title input, textarea, buttons)
- `src/app/search/loading.tsx` — search bar + results skeleton
- `src/app/admin/loading.tsx` — dashboard cards skeleton
- `src/app/calendar/loading.tsx` — calendar grid skeleton

Each follows the same pattern: import `Skeleton`, return layout-preserving placeholders matching the page's visual structure. Keep them simple — 15-25 lines each.

**Step 6: Verify build**

Run: `npm run build`
Expected: PASS (loading.tsx files are automatically wrapped in Suspense by Next.js)

**Step 7: Commit**

```bash
git add src/components/ui/skeleton.tsx src/app/loading.tsx src/app/events/loading.tsx src/app/events/\[id\]/loading.tsx src/app/events/create/loading.tsx src/app/search/loading.tsx src/app/admin/loading.tsx src/app/calendar/loading.tsx
git commit -m "feat: add Skeleton component and loading.tsx files for all routes"
```

---

### Task 3: Create error.tsx files (Next.js error boundaries)

**Files:**
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/events/error.tsx`
- Create: `src/app/events/[id]/error.tsx`
- Create: `src/app/events/create/error.tsx`
- Create: `src/app/search/error.tsx`
- Create: `src/app/admin/error.tsx`
- Create: `src/app/calendar/error.tsx`

**Step 1: Create `src/app/global-error.tsx`**

This catches errors in the root layout itself. It must render its own `<html>` and `<body>` since the layout may have crashed.

```tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex items-center justify-center bg-[#0A0A0A] text-[#F5F5F4]">
        <div className="text-center px-6 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-[#A8A8A3] mb-6">
            We hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#64FFDA] text-[#0A0A0A] rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

**Step 2: Create `src/app/not-found.tsx`**

Custom 404 page using the app's design system.

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
      <p className="text-text-secondary mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
      >
        Back to home
      </Link>
    </div>
  );
}
```

**Step 3: Create `src/app/error.tsx` (root route error boundary)**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <AlertTriangle className="w-12 h-12 text-primary mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-text-secondary mb-6 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
```

**Step 4: Create route-specific error.tsx files**

Create error.tsx for: `events/`, `events/[id]/`, `events/create/`, `search/`, `admin/`, `calendar/`. Each follows the same pattern as root `error.tsx` but with route-specific messaging:

- `events/error.tsx` — "Failed to load events"
- `events/[id]/error.tsx` — "Failed to load event details"
- `events/create/error.tsx` — "Failed to load event form"
- `search/error.tsx` — "Search encountered an error"
- `admin/error.tsx` — "Admin dashboard error"
- `calendar/error.tsx` — "Failed to load calendar"

All are `"use client"` components with `{ error, reset }` props and a "Try again" button.

**Step 5: Verify build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/global-error.tsx src/app/not-found.tsx src/app/error.tsx src/app/events/error.tsx src/app/events/\[id\]/error.tsx src/app/events/create/error.tsx src/app/search/error.tsx src/app/admin/error.tsx src/app/calendar/error.tsx
git commit -m "feat: add error.tsx boundaries for all route segments"
```

---

### Task 4: Integrate error boundaries into layout.tsx (app shell isolation)

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update `src/app/layout.tsx`**

Wrap providers, Header, and Footer in error boundaries so the app shell always survives child crashes. Add `id="main-content"` to `<main>` for skip-to-content.

Current layout structure:
```tsx
<StytchProvider>
  <AuthProvider>
    <ThemeProvider>
      <AnimatedBackground />
      <Header />
      <main>{children}</main>
      <Footer />
    </ThemeProvider>
  </AuthProvider>
</StytchProvider>
```

New structure:
```tsx
import { ErrorBoundary } from "@/components/error/error-boundary";
import { WidgetErrorBoundary } from "@/components/error/widget-error-boundary";

// ... in the body:
<ErrorBoundary fallback={<DegradedShell />}>
  <StytchProvider>
    <AuthProvider>
      <ThemeProvider defaultTheme="system">
        <AnimatedBackground enableAnimation={true} intensity={0.2} speed={0.3} />
        <WidgetErrorBoundary fallback={<MinimalNav />} name="Header">
          <Header />
        </WidgetErrorBoundary>
        <main id="main-content" className="flex-1 relative z-10">{children}</main>
        <WidgetErrorBoundary fallback={null} name="Footer">
          <Footer />
        </WidgetErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  </StytchProvider>
</ErrorBoundary>
```

Define `DegradedShell` and `MinimalNav` as inline components in layout.tsx:

```tsx
function DegradedShell() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">nhimbe</h1>
      <p className="text-text-secondary mb-6">Something went wrong loading the app. Please refresh the page.</p>
      <a href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">
        Refresh
      </a>
    </div>
  );
}

function MinimalNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-elevated/50">
      <div className="max-w-300 mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-primary">nhimbe</a>
        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <a href="/events">Events</a>
          <a href="/search">Search</a>
        </nav>
      </div>
    </header>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app shell in error boundaries for crash isolation"
```

---

### Task 5: Worker observability middleware (request ID + structured logging)

**Files:**
- Create: `worker/src/middleware/observability.ts`
- Modify: `worker/src/index.ts` — add middleware imports and mount
- Modify: `worker/src/types.ts` — extend Hono context variables type

**Step 1: Extend Hono context type in `worker/src/types.ts`**

Add a `Variables` interface alongside `Env`:

```typescript
// Add after the Env interface
export interface AppVariables {
  requestId: string;
}
```

**Step 2: Update app type in `worker/src/index.ts`**

Change:
```typescript
const app = new Hono<{ Bindings: Env }>();
```
To:
```typescript
import type { AppVariables } from "./types";
const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
```

Also update all route module types to use the same generic (or keep them as `{ Bindings: Env }` since Variables propagate from parent app).

**Step 3: Create `worker/src/middleware/observability.ts`**

```typescript
import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types";

// Request ID — generate or forward from upstream
export const requestId = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const id = c.req.header("X-Request-ID") || crypto.randomUUID();
    c.set("requestId", id);
    c.header("X-Request-ID", id);
    await next();
  }
);

// Structured JSON logging for every request
export const requestLogger = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";

    console.log(
      JSON.stringify({
        level,
        requestId: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: duration,
        userAgent: c.req.header("User-Agent")?.substring(0, 100),
      })
    );
  }
);
```

**Step 4: Mount middleware in `worker/src/index.ts`**

Add after CORS middleware, before route mounting:

```typescript
import { requestId, requestLogger } from "./middleware/observability";

// After cors() middleware:
app.use("*", requestId);
app.use("*", requestLogger);
```

**Step 5: Update global error handler to include request ID**

```typescript
app.onError((err, c) => {
  const reqId = c.get("requestId");
  console.error(JSON.stringify({
    level: "error",
    requestId: reqId,
    error: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
  }));
  return c.json(
    {
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Unknown error",
      requestId: reqId,
    },
    500
  );
});
```

**Step 6: Verify**

Run: `cd worker && npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 7: Commit**

```bash
git add worker/src/middleware/observability.ts worker/src/index.ts worker/src/types.ts
git commit -m "feat: add request ID and structured logging middleware to worker"
```

---

### Task 6: Worker rate limiting middleware

**Files:**
- Create: `worker/src/middleware/rate-limit.ts`
- Modify: `worker/src/index.ts` — mount rate limiter on write + AI endpoints

**Step 1: Create `worker/src/middleware/rate-limit.ts`**

```typescript
import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.RATE_LIMITER) {
    await next();
    return;
  }

  const key = c.req.header("CF-Connecting-IP") || "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key });

  if (!success) {
    return c.json({ error: "Rate limit exceeded. Please try again later." }, 429);
  }

  await next();
});
```

**Step 2: Mount on AI and auth endpoints in `worker/src/index.ts`**

After the global middleware, before route mounting:

```typescript
import { rateLimit } from "./middleware/rate-limit";

// Rate limit AI and auth endpoints
app.use("/api/assistant/*", rateLimit);
app.use("/api/ai/*", rateLimit);
app.use("/api/auth/*", rateLimit);
app.use("/api/search", rateLimit);
```

**Step 3: Export from middleware barrel**

Add to `worker/src/middleware/index.ts`:
```typescript
export { rateLimit } from "./rate-limit";
export { requestId, requestLogger } from "./observability";
```

**Step 4: Verify**

Run: `cd worker && npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add worker/src/middleware/rate-limit.ts worker/src/middleware/index.ts worker/src/index.ts
git commit -m "feat: wire up rate limiting middleware on AI and auth endpoints"
```

---

### Task 7: Health check upgrade (actual service probing)

**Files:**
- Modify: `worker/src/routes/health.ts`

**Step 1: Update health check to probe services**

Replace the static binding-existence check with actual probes:

```typescript
health.get("/api/health", async (c) => {
  const probes: Record<string, { ok: boolean; latencyMs: number }> = {};

  // Probe D1
  const dbStart = Date.now();
  try {
    await c.env.DB.prepare("SELECT 1").first();
    probes.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch {
    probes.database = { ok: false, latencyMs: Date.now() - dbStart };
  }

  // Probe KV
  const kvStart = Date.now();
  try {
    await c.env.CACHE.get("__health_check__");
    probes.cache = { ok: true, latencyMs: Date.now() - kvStart };
  } catch {
    probes.cache = { ok: false, latencyMs: Date.now() - kvStart };
  }

  // Binding presence checks (can't probe without actual work)
  probes.ai = { ok: !!c.env.AI, latencyMs: 0 };
  probes.vectorize = { ok: !!c.env.VECTORIZE, latencyMs: 0 };

  const allOk = Object.values(probes).every((p) => p.ok);

  return c.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: probes,
  });
});
```

**Step 2: Verify**

Run: `cd worker && npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 3: Commit**

```bash
git add worker/src/routes/health.ts
git commit -m "feat: upgrade health check to probe D1 and KV with latency"
```

---

### Task 8: AI circuit breakers (timeout wrapper)

**Files:**
- Create: `worker/src/utils/timeout.ts`
- Modify: `worker/src/ai/search.ts` — wrap AI calls with timeout
- Modify: `worker/src/ai/assistant.ts` — wrap AI calls with timeout
- Modify: `worker/src/ai/description-generator.ts` — wrap AI calls with timeout

**Step 1: Create `worker/src/utils/timeout.ts`**

```typescript
/**
 * Wrap a promise with a timeout. Returns fallback if the promise doesn't resolve in time.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`Operation timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId!);
  }
}
```

**Step 2: Wrap AI calls in `worker/src/ai/search.ts`**

Find all `ai.run()` calls in search.ts and wrap with `withTimeout`:

```typescript
import { withTimeout } from "../utils/timeout";

// In generateSearchSummary — wrap the ai.run() call:
const result = await withTimeout(
  ai.run(LLM_MODEL, { messages, max_tokens: 200 }),
  10_000,
  null
);
if (!result) return `Found ${events.length} events matching your search.`;
```

Apply the same pattern to assistant.ts and description-generator.ts. Each AI call gets a 10-second timeout with an appropriate fallback.

**Step 3: Export from utils barrel**

Add to `worker/src/utils/index.ts`:
```typescript
export { withTimeout } from "./timeout";
```

**Step 4: Verify**

Run: `cd worker && npx tsc --noEmit && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add worker/src/utils/timeout.ts worker/src/utils/index.ts worker/src/ai/
git commit -m "feat: add timeout wrapper for AI calls with 10s circuit breaker"
```

---

### Task 9: Skip-to-content link and LiveRegion provider

**Files:**
- Create: `src/components/ui/live-region.tsx`
- Modify: `src/app/layout.tsx` — add skip link + LiveRegionProvider

**Step 1: Create `src/components/ui/live-region.tsx`**

```tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type AnnounceFunction = (message: string) => void;

const LiveRegionContext = createContext<AnnounceFunction>(() => {});

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((text: string) => {
    // Clear then set to ensure re-announcement of same message
    setMessage("");
    requestAnimationFrame(() => setMessage(text));
  }, []);

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useAnnounce(): AnnounceFunction {
  return useContext(LiveRegionContext);
}
```

**Step 2: Add skip-to-content link and LiveRegionProvider to layout.tsx**

At the top of the `<body>` (before all other elements), add:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold"
>
  Skip to main content
</a>
```

Wrap the error boundary contents with `<LiveRegionProvider>`:

```tsx
<ErrorBoundary fallback={<DegradedShell />}>
  <StytchProvider>
    <AuthProvider>
      <ThemeProvider>
        <LiveRegionProvider>
          {/* ... Header, main, Footer ... */}
        </LiveRegionProvider>
      </ThemeProvider>
    </AuthProvider>
  </StytchProvider>
</ErrorBoundary>
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ui/live-region.tsx src/app/layout.tsx
git commit -m "feat: add skip-to-content link and aria-live region provider"
```

---

### Task 10: Focus trap hook and modal Escape handling

**Files:**
- Create: `src/lib/use-focus-trap.ts`

**Step 1: Create `src/lib/use-focus-trap.ts`**

```tsx
"use client";

import { useEffect, useRef, RefObject } from "react";

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!options.isActive || !ref.current) return;

    const element = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the trap
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const firstFocusable = element.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        options.onEscape?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = element.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    element.addEventListener("keydown", handleKeyDown);

    return () => {
      element.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [options.isActive, options.onEscape]);

  return ref;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` (from root)
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/use-focus-trap.ts
git commit -m "feat: add useFocusTrap hook with Escape key and Tab cycling"
```

---

### Task 11: ARIA improvements (Button, Input, Tabs, nav, event cards)

**Files:**
- Modify: `src/components/ui/button.tsx` — add focus-visible ring
- Modify: `src/components/ui/input.tsx` — add aria-invalid, aria-describedby
- Modify: `src/components/ui/tabs.tsx` — add aria-controls, aria-labelledby, arrow keys
- Modify: `src/components/layout/header.tsx` — add aria-label on nav, aria-current on active links
- Modify: `src/components/layout/footer.tsx` — add aria-label on nav
- Modify: `src/components/ui/event-card.tsx` — change wrapper to `<article>`

**Step 1: Fix Button focus-visible**

In `button.tsx`, add focus-visible ring to `baseStyles`:

```
const baseStyles = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
```

**Step 2: Fix Input aria-invalid and aria-describedby**

In `input.tsx`, generate a unique ID for error messages and link them:

```tsx
const errorId = error ? `${props.id || "input"}-error` : undefined;

<input
  ref={ref}
  aria-invalid={error ? true : undefined}
  aria-describedby={errorId}
  // ... rest
/>
{error && (
  <p id={errorId} className="mt-1 text-xs text-red-400" role="alert">{error}</p>
)}
```

**Step 3: Fix Tabs — aria-controls, aria-labelledby, arrow key navigation**

In `tabs.tsx`:

1. `TabsTrigger`: Add `id={`tab-${value}`}` and `aria-controls={`tabpanel-${value}`}`
2. `TabsContent`: Add `id={`tabpanel-${value}`}` and `aria-labelledby={`tab-${value}`}`
3. `TabsList`: Add `onKeyDown` handler for ArrowLeft/ArrowRight to cycle between tabs:

```tsx
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const tabs = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]');
  const current = Array.from(tabs).findIndex((t) => t === document.activeElement);
  if (current === -1) return;

  e.preventDefault();
  const next = e.key === "ArrowRight"
    ? (current + 1) % tabs.length
    : (current - 1 + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}
```

Add `onKeyDown={handleKeyDown}` to the TabsList `<div>`.

**Step 4: Fix Header nav**

In `header.tsx`:
- Add `aria-label="Main navigation"` to the `<nav>` element
- Add `aria-current={pathname === link.href ? "page" : undefined}` to each nav link

**Step 5: Fix Footer nav**

In `footer.tsx`:
- Add `aria-label="Footer navigation"` to the `<nav>` element

**Step 6: Fix event card — article wrapper**

In `event-card.tsx`:
- Find the outermost wrapper element (likely a `<div>` or `<Link>`) and change to `<article>` or wrap in `<article>`

**Step 7: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: PASS

**Step 8: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/tabs.tsx src/components/layout/header.tsx src/components/layout/footer.tsx src/components/ui/event-card.tsx
git commit -m "feat: ARIA improvements - focus rings, labels, keyboard nav, landmarks"
```

---

### Task 12: Extract BottomSheetModal and modals from create-event page

**Files:**
- Create: `src/components/modals/bottom-sheet-modal.tsx`
- Create: `src/components/modals/date-time-modal.tsx`
- Create: `src/components/modals/location-modal.tsx`
- Create: `src/components/modals/category-modal.tsx`
- Create: `src/components/modals/description-modal.tsx`
- Create: `src/components/modals/ticketing-modal.tsx`
- Create: `src/components/modals/capacity-modal.tsx`
- Modify: `src/app/events/create/page.tsx` — replace inline modals with components

**Step 1: Read `src/app/events/create/page.tsx` in full**

Read the entire file to identify the 6 modal blocks and their state variables.

**Step 2: Create `src/components/modals/bottom-sheet-modal.tsx`**

Shared wrapper with focus trap + Escape handling + overlay:

```tsx
"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/lib/use-focus-trap";

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheetModal({ isOpen, onClose, title, children }: BottomSheetModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-background rounded-t-2xl sm:rounded-2xl border border-elevated p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-elevated transition-colors"
            aria-label={`Close ${title}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

**Step 3: Extract each modal**

For each of the 6 modals (date-time, location, category, description, ticketing, capacity):

1. Read the inline modal JSX from `create/page.tsx`
2. Create a new component file that accepts the relevant state + setter props
3. Move the modal content into the new component, wrapping it in `<BottomSheetModal>`

Each modal component follows this pattern:

```tsx
"use client";

import { BottomSheetModal } from "./bottom-sheet-modal";

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateDay: string;
  setDateDay: (v: string) => void;
  // ... other state props
}

export function DateTimeModal({ isOpen, onClose, ...props }: DateTimeModalProps) {
  return (
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Date & Time">
      {/* Modal content extracted from create/page.tsx */}
    </BottomSheetModal>
  );
}
```

**Step 4: Update `create/page.tsx` to use the modal components**

Replace inline modal JSX with the new components, passing state as props.

**Step 5: Verify build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/modals/ src/app/events/create/page.tsx
git commit -m "refactor: extract 6 bottom-sheet modals from create-event page"
```

---

### Task 13: Extract shared CityDropdown component

**Files:**
- Create: `src/components/ui/city-dropdown.tsx`
- Modify: `src/app/page.tsx` — use shared CityDropdown
- Modify: `src/app/events/page.tsx` — use shared CityDropdown

**Step 1: Read both pages to identify the duplicated city dropdown pattern**

Read `src/app/page.tsx` and `src/app/events/page.tsx`, find the city dropdown JSX.

**Step 2: Create `src/components/ui/city-dropdown.tsx`**

Extract the common pattern into a reusable component:

```tsx
"use client";

import { ChevronDown } from "lucide-react";

const cities = [
  { value: "all", label: "All Cities" },
  { value: "Harare", label: "Harare" },
  { value: "Bulawayo", label: "Bulawayo" },
  { value: "Victoria Falls", label: "Victoria Falls" },
  { value: "Johannesburg", label: "Johannesburg" },
  { value: "Cape Town", label: "Cape Town" },
  { value: "Nairobi", label: "Nairobi" },
  { value: "Lagos", label: "Lagos" },
  { value: "Accra", label: "Accra" },
];

interface CityDropdownProps {
  value: string;
  onChange: (city: string) => void;
  className?: string;
}

export function CityDropdown({ value, onChange, className = "" }: CityDropdownProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-surface border border-elevated rounded-xl px-4 py-2 pr-8 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Select city"
      >
        {cities.map((city) => (
          <option key={city.value} value={city.value}>
            {city.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
    </div>
  );
}
```

Adjust exact cities, markup, and styles to match the existing inline implementations.

**Step 3: Replace inline dropdowns in both pages**

Import and use `<CityDropdown value={activeCity} onChange={setActiveCity} />` in both pages.

**Step 4: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/city-dropdown.tsx src/app/page.tsx src/app/events/page.tsx
git commit -m "refactor: extract shared CityDropdown component from home and events pages"
```

---

### Task 14: Lazy loading heavy components with next/dynamic

**Files:**
- Modify: `src/app/events/create/page.tsx` — lazy load the form
- Modify pages that use heavy widgets — lazy load CommunityInsights, ReferralLeaderboard, AI wizard

**Step 1: Wrap create-event form in next/dynamic**

In `src/app/events/create/page.tsx`, if the main form component is in the same file, extract it to a separate file (e.g., `create-event-form.tsx`) then:

```tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const CreateEventForm = dynamic(() => import("./create-event-form"), {
  ssr: false,
  loading: () => (
    <div className="max-w-300 mx-auto px-6 py-12 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  ),
});
```

**Step 2: Lazy load sidebar widgets**

Where `CommunityInsights`, `ReferralLeaderboard`, or AI widgets are imported, wrap them:

```tsx
const CommunityInsights = dynamic(
  () => import("@/components/ui/community-insights").then(m => ({ default: m.CommunityInsights })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-xl" /> }
);
```

**Step 3: Verify build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/events/create/
git commit -m "feat: lazy load create-event form and sidebar widgets"
```

---

### Task 15: RSC migration for events and home pages

**Files:**
- Modify: `src/app/events/page.tsx` — convert to server component with client child
- Modify: `src/app/page.tsx` — convert to server component with client child

**Step 1: Read both pages to understand current data fetching pattern**

Both use `useEffect` + `useState` in `"use client"` components.

**Step 2: Migrate events page**

Split `src/app/events/page.tsx` into:
- `page.tsx` (server component) — fetches initial events from API
- `events-client.tsx` (client component) — receives initial data, handles interactivity

```tsx
// src/app/events/page.tsx (server component)
import { EventsClient } from "./events-client";

async function fetchInitialEvents() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events?limit=20`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const initialEvents = await fetchInitialEvents();
  return <EventsClient initialEvents={initialEvents} />;
}
```

Move all the current `"use client"` logic into `events-client.tsx`, accepting `initialEvents` as a prop and using it as the initial state.

**Step 3: Migrate home page**

Same pattern — server component fetches featured events, passes to client component.

**Step 4: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: PASS (frontend tests may need updating if they import from these pages directly)

**Step 5: Commit**

```bash
git add src/app/events/ src/app/page.tsx
git commit -m "refactor: migrate events and home pages to RSC data fetching"
```

---

### Task 16: Final verification and PR creation

**Step 1: Run full CI locally**

```bash
npm run lint
npm run build
npx vitest run
cd worker && npx tsc --noEmit && npx vitest run
```

All must PASS.

**Step 2: Review git log**

```bash
git log --oneline feature/hono-migration..HEAD
```

Verify all commits are clean and well-described.

**Step 3: Push and create PR**

```bash
git push -u origin feature/resilience-a11y
gh pr create --base feature/hono-migration --title "feat: resilience, observability & accessibility" --body "..."
```

PR body should summarize all 6 design sections with checkmarks.
