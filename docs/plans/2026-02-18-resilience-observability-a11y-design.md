# Resilience, Observability & Accessibility Design

**Date:** 2026-02-18
**Branch:** feature/resilience-observability-a11y (from feature/hono-migration)

## Problem

A single component crash kills the entire React tree (white screen). The worker has no structured logging, no request tracing, and the rate limiter binding is wired but never called. Accessibility gaps exist in focus management, live regions, and ARIA completeness.

## Goals

1. **No single component breaks the site** — error boundaries at every level
2. **App shell always live** — Header/Footer/nav survive child crashes
3. **Observability in worker** — structured logging, request IDs, timing, rate limiting
4. **Circuit breakers** — AI call timeouts, fallbacks, rate limiting
5. **Accessibility** — focus traps, live regions, keyboard nav, ARIA completeness
6. **Layered architecture** — components over hard-coded elements, lazy loading

---

## Section 1: Error Boundary Architecture

### File-based boundaries (Next.js convention)

```
src/app/global-error.tsx         — root layout crash fallback (full HTML)
src/app/not-found.tsx            — custom 404 page
src/app/error.tsx                — root route segment error
src/app/events/error.tsx
src/app/events/[id]/error.tsx
src/app/events/create/error.tsx
src/app/search/error.tsx
src/app/admin/error.tsx
src/app/calendar/error.tsx
```

Each `error.tsx` is a client component that receives `{ error, reset }` props. Shows a branded error card with a "Try again" button calling `reset()`.

### Component-level boundaries

`src/components/error/error-boundary.tsx` — reusable class component wrapping `componentDidCatch` / `getDerivedStateFromError`. Two variants:

- `<AppShellBoundary>` — wraps providers/header/footer, falls back to degraded shell
- `<WidgetErrorBoundary>` — wraps non-critical widgets, falls back to small error card or null

### Layout integration

```tsx
// src/app/layout.tsx
<AppShellBoundary fallback={<DegradedShell />}>
  <StytchProvider>
    <AuthProvider>
      <ThemeProvider>
        <AnimatedBackground />
        <WidgetErrorBoundary fallback={<MinimalNav />}>
          <Header />
        </WidgetErrorBoundary>
        <main id="main-content">{children}</main>
        <WidgetErrorBoundary fallback={null}>
          <Footer />
        </WidgetErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  </StytchProvider>
</AppShellBoundary>
```

---

## Section 2: Loading States

### Route-level loading files

```
src/app/loading.tsx              — root (minimal skeleton)
src/app/events/loading.tsx       — event list skeleton
src/app/events/[id]/loading.tsx  — event detail skeleton
src/app/events/create/loading.tsx
src/app/search/loading.tsx       — search skeleton
src/app/admin/loading.tsx        — admin skeleton
src/app/calendar/loading.tsx     — calendar skeleton
```

### Skeleton component

`src/components/ui/skeleton.tsx` — `animate-pulse` primitive:

```tsx
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-elevated", className)} />;
}
```

Used by all `loading.tsx` files to create layout-preserving placeholders.

---

## Section 3: Lazy Loading & Code Splitting

Use `next/dynamic` with `ssr: false` for heavy client-only pages/components:

| Component | Reason |
|-----------|--------|
| `events/create` form | 979 lines, client-only, heavy |
| Admin dashboard widgets | Admin-only, rarely loaded |
| Calendar grid | Date-heavy, client-only |
| AI Description Wizard | AI-specific, optional feature |
| CommunityInsights | Sidebar widget, non-critical |
| ReferralLeaderboard | Sidebar widget, non-critical |

---

## Section 4: Worker Observability

### Request ID middleware

```typescript
// worker/src/middleware/observability.ts
app.use("*", async (c, next) => {
  const requestId = c.req.header("X-Request-ID") || crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
});
```

### Structured logging middleware

```typescript
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(JSON.stringify({
    level: c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info",
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: duration,
  }));
});
```

### Rate limiting middleware

Wire up the existing `RATE_LIMITER` binding:

```typescript
// worker/src/middleware/rate-limit.ts
export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.RATE_LIMITER) { await next(); return; }
  const key = c.req.header("CF-Connecting-IP") || "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key });
  if (!success) return c.json({ error: "Rate limit exceeded" }, 429);
  await next();
});
```

Applied to: AI endpoints, auth endpoints, write operations.

### Health check upgrade

`/api/health` probes D1 (`SELECT 1`), KV (get test key), reports latency:

```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": { "ok": true, "latencyMs": 3 },
    "cache": { "ok": true, "latencyMs": 1 },
    "ai": true,
    "vectorize": true
  }
}
```

---

## Section 5: AI Circuit Breakers

### Timeout wrapper

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const result = await promise;
    return result;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
```

Applied to all `env.AI.run()` calls with 10s timeout and fallback responses.

---

## Section 6: Accessibility

### Skip-to-content link

First element in `layout.tsx`:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute ...">
  Skip to main content
</a>
```

### LiveRegion component

```tsx
// src/components/ui/live-region.tsx
const LiveRegionContext = createContext<(message: string) => void>(() => {});

function LiveRegionProvider({ children }) {
  const [message, setMessage] = useState("");
  return (
    <LiveRegionContext.Provider value={setMessage}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{message}</div>
    </LiveRegionContext.Provider>
  );
}

export const useAnnounce = () => useContext(LiveRegionContext);
```

Wired to: search results loaded, RSVP success/failure, form submission, AI generation complete.

### Focus trap + Escape handling

`src/lib/use-focus-trap.ts` — hook that traps Tab/Shift+Tab inside a ref, and calls `onClose` on Escape.

Applied to all modals in `events/create/page.tsx` and profile sign-out confirmation.

### ARIA improvements

- `Button`: add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- `Input`/`Textarea`: add `aria-invalid` when `error` prop is truthy, `aria-describedby` linking to error message
- `Tabs`: add `aria-controls`/`aria-labelledby`, arrow key navigation
- `<nav>` elements: add `aria-label="Main navigation"` / `"Footer navigation"`
- Active nav links: add `aria-current="page"`
- Event cards: change wrapper from `<div>` to `<article>`

---

## Section 7: Component Architecture

### Extract from `events/create/page.tsx`

6 bottom-sheet modals → individual components:

```
src/components/modals/bottom-sheet-modal.tsx    — shared wrapper (focus trap, Escape, overlay)
src/components/modals/date-time-modal.tsx
src/components/modals/location-modal.tsx
src/components/modals/category-modal.tsx
src/components/modals/description-modal.tsx
src/components/modals/ticketing-modal.tsx
src/components/modals/capacity-modal.tsx
```

### Extract shared components

- `src/components/ui/city-dropdown.tsx` — deduplicate from home + events pages
- `src/components/ui/skeleton.tsx` — loading primitive

### RSC migration

- `events/page.tsx` — fetch events server-side, pass to `<EventList>` client component
- `home/page.tsx` — fetch featured events server-side
- `search/page.tsx` — stays client-side (interactive search)

---

## Non-goals for this PR

- Full test rewrite (accessibility tests using @testing-library/react)
- Stytch provider replacement
- Database schema changes
- Frontend-backend API contract changes
