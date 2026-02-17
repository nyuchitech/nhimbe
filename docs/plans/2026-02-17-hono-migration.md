# Hono Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the 3,362-line `worker/src/index.ts` monolith to Hono router framework with modular route files, zero behavior changes.

**Architecture:** Extract all handlers into domain-grouped route modules (`routes/*.ts`), shared utilities into `utils/`, auth/origin middleware into `middleware/`, keep Hono app shell as thin dispatcher. Queue handlers move to `queues/`. All existing tests must pass after each task.

**Tech Stack:** Hono (Workers-native router), TypeScript strict mode, Vitest, Cloudflare Workers

---

## Important Context

### Current test approach
Tests in `worker/src/__tests__/` **re-implement private functions** from `index.ts` (they copy-paste `safeParseInt`, `isAllowedOrigin`, etc.) since they can't import them. After this refactor, tests should import from the new modules directly.

### Response format
The current `jsonResponse()` adds CORS headers and pretty-prints JSON. Hono's `c.json()` does not pretty-print by default and doesn't add CORS headers (that's handled by `cors()` middleware). To maintain identical response bodies, we'll use `c.json(data, status)` with CORS handled by middleware. **Note:** We drop pretty-printing (`JSON.stringify(data, null, 2)` → compact JSON) — this is an acceptable change since no client parses whitespace.

### Queue handlers
Hono handles `fetch` only. The `queue` handler must be exported separately alongside the Hono app. The export shape changes from `ExportedHandler<Env>` to `{ fetch, queue }`.

### Line ranges for reference
These are approximate line ranges in the current `index.ts` for each handler group:
- Utilities (validation, ID gen): 36-100, 2725-2826
- Fetch handler (routing): 102-387
- Queue processors: 389-438
- Status page: 440-744
- Events: 750-940
- Search/AI: 941-1070
- Auth: 1189-1438
- Registrations: 1444-1622
- Media: 1623-1715
- Categories/Cities: 1721-1788
- Seed: 1794-2075
- Reviews: 2076-2252
- Referrals: 2254-2500
- Stats/Reputation/Community: 2497-2740
- Admin: 2828-3362

---

### Task 1: Install Hono and verify setup

**Files:**
- Modify: `worker/package.json`

**Step 1: Install Hono**

Run:
```bash
cd worker && npm install hono
```

**Step 2: Verify Hono is in dependencies**

Run:
```bash
cd worker && node -e "require('hono')" 2>&1 || echo "Hono not found"
```
Expected: No output (success)

**Step 3: Verify existing tests still pass**

Run:
```bash
cd worker && npx vitest run
```
Expected: All tests PASS (no changes to code yet)

**Step 4: Commit**

```bash
git add worker/package.json worker/package-lock.json
git commit -m "chore: add hono dependency for router migration"
```

---

### Task 2: Extract shared utilities

**Files:**
- Create: `worker/src/utils/response.ts`
- Create: `worker/src/utils/validation.ts`
- Create: `worker/src/utils/ids.ts`
- Create: `worker/src/utils/db.ts`
- Create: `worker/src/utils/index.ts`

Extract these functions from `index.ts` into importable modules. **Do not modify `index.ts` yet** — the old code stays until route modules are ready.

**Step 1: Create `worker/src/utils/validation.ts`**

```typescript
// Safe integer parsing with bounds
export function safeParseInt(value: string | null, defaultValue: number, min: number = 0, max: number = 1000): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

// Validate required string fields
export function validateRequiredFields(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && !(obj[field] as string).trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Safe JSON parse with error handling
export function safeParseJSON(value: string | null, defaultValue: unknown = []): unknown {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
```

**Step 2: Create `worker/src/utils/ids.ts`**

```typescript
export function generateId(): string {
  return crypto.randomUUID();
}

export function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `@${base}${suffix}`;
}
```

**Step 3: Create `worker/src/utils/db.ts`**

```typescript
import type { Event } from "../types";
import { safeParseJSON } from "./validation";

// Convert database row to Event object
export function dbRowToEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    shortCode: row.short_code as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    date: {
      day: row.date_day as string,
      month: row.date_month as string,
      full: row.date_full as string,
      time: row.date_time as string,
      iso: row.date_iso as string,
    },
    location: {
      venue: row.location_venue as string,
      address: row.location_address as string,
      city: row.location_city as string,
      country: row.location_country as string,
    },
    category: row.category as string,
    tags: safeParseJSON((row.tags as string), []) as string[],
    coverImage: row.cover_image as string | undefined,
    coverGradient: row.cover_gradient as string | undefined,
    attendeeCount: row.attendee_count as number,
    friendsCount: row.friends_count as number | undefined,
    capacity: row.capacity as number | undefined,
    isOnline: row.is_online as boolean | undefined,
    meetingUrl: row.meeting_url as string | undefined,
    meetingPlatform: row.meeting_platform as "zoom" | "google_meet" | "teams" | "other" | undefined,
    host: {
      name: row.host_name as string,
      handle: row.host_handle as string,
      initials: row.host_initials as string,
      eventCount: row.host_event_count as number,
    },
    isFree: row.is_free !== false && row.is_free !== 0,
    ticketUrl: row.ticket_url as string | undefined,
    price: row.price_amount
      ? {
          amount: row.price_amount as number,
          currency: row.price_currency as string,
          label: row.price_label as string,
        }
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

**Step 4: Create `worker/src/utils/response.ts`**

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

// Legacy jsonResponse for status page and non-Hono contexts
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export { corsHeaders };
```

**Step 5: Create barrel export `worker/src/utils/index.ts`**

```typescript
export { safeParseInt, validateRequiredFields, safeParseJSON, slugify, getInitials } from "./validation";
export { generateId, generateShortCode, generateReferralCode, generateHandle } from "./ids";
export { dbRowToEvent } from "./db";
export { jsonResponse, corsHeaders } from "./response";
```

**Step 6: Verify TypeScript compiles**

Run:
```bash
cd worker && npx tsc --noEmit
```
Expected: PASS (new files compile, old index.ts still works independently)

**Step 7: Verify tests still pass**

Run:
```bash
cd worker && npx vitest run
```
Expected: All tests PASS

**Step 8: Commit**

```bash
git add worker/src/utils/
git commit -m "refactor: extract shared utilities into worker/src/utils/"
```

---

### Task 3: Create middleware modules

**Files:**
- Create: `worker/src/middleware/auth.ts`
- Create: `worker/src/middleware/index.ts`

**Step 1: Create `worker/src/middleware/auth.ts`**

```typescript
import { createMiddleware } from "hono/factory";
import type { Env } from "../types";
import { getAuthenticatedUser } from "../auth/stytch";
import { hasPermission, type UserRole } from "../types";

// Trusted domains — always allow these and all their subdomains
const TRUSTED_DOMAINS = ["nyuchi.com", "mukoko.com", "nhimbe.com"];

// Check if request origin is allowed
export function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return false;

  if (origin.startsWith("http://localhost:")) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    if (TRUSTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }
  } catch {
    // Invalid origin URL
  }

  const extraOrigins = (env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  return extraOrigins.some(allowed => origin === allowed.trim());
}

// Validate API key from request
export function validateApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");
  return apiKey === env.API_KEY;
}

// Middleware: require API key or allowed origin for write operations
export const writeAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    if (!validateApiKey(c.req.raw, c.env) && !isAllowedOrigin(c.req.raw, c.env)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
  await next();
});

// Middleware: require API key (admin endpoints)
export const apiKeyRequired = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!validateApiKey(c.req.raw, c.env)) {
    return c.json({ error: "Unauthorized - API key required" }, 401);
  }
  await next();
});

// Helper: get authenticated admin user with role check (not middleware — used inline)
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function getAdminUser(request: Request, env: Env, requiredRole: UserRole): Promise<AdminUser | null> {
  const authResult = await getAuthenticatedUser(request, env);
  if (!authResult.user) return null;
  const stytchUser = authResult.user;

  interface DbUserRow {
    id: string;
    email: string;
    name: string;
    role: string | null;
  }

  const user = await env.DB.prepare(
    "SELECT id, email, name, role FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUserRow | null;

  if (!user) return null;

  const userRole = (user.role || "user") as UserRole;
  if (!hasPermission(userRole, requiredRole)) return null;

  return { id: user.id, email: user.email, name: user.name, role: userRole };
}
```

**Step 2: Create barrel export `worker/src/middleware/index.ts`**

```typescript
export { isAllowedOrigin, validateApiKey, writeAuth, apiKeyRequired, getAdminUser } from "./auth";
export type { AdminUser } from "./auth";
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd worker && npx tsc --noEmit
```
Expected: PASS

**Step 4: Commit**

```bash
git add worker/src/middleware/
git commit -m "refactor: extract auth middleware into worker/src/middleware/"
```

---

### Task 4: Create the Hono app shell (index.ts replacement)

This is the most critical task. We create the new `index.ts` with Hono, but **we do it incrementally**: first create the app shell with a few routes to verify the pattern works, then extract remaining routes in subsequent tasks.

**Files:**
- Create: `worker/src/routes/health.ts`
- Create: `worker/src/routes/categories.ts`
- Modify: `worker/src/index.ts` (backup old, write new shell)

**Step 1: Create `worker/src/routes/health.ts`**

Start with the simplest routes — health check and root status page.

Copy the `statusPage()` function (lines 444-744 of current index.ts) and the health/root handlers into this file.

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

const VERSION = "0.2.0";

export const health = new Hono<{ Bindings: Env }>();

// Root endpoint - Status Page or JSON
health.get("/", (c) => {
  const accept = c.req.header("Accept") || "";
  if (accept.includes("application/json")) {
    return c.json({
      name: "nhimbe API",
      version: VERSION,
      status: "healthy",
      environment: c.env.ENVIRONMENT,
      features: ["events", "search", "ai-assistant", "recommendations"],
    });
  }
  return statusPage(c.env);
});

// Health check
health.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      ai: !!c.env.AI,
      vectorize: !!c.env.VECTORIZE,
      database: !!c.env.DB,
      cache: !!c.env.CACHE,
    },
  });
});

// Copy the entire statusPage function from current index.ts lines 444-744
function statusPage(env: Env): Response {
  // ... (copy entire function body from index.ts)
  // This is a large HTML template — copy verbatim
}
```

**IMPORTANT:** Copy the `statusPage` function body verbatim from `worker/src/index.ts` lines 444-744.

**Step 2: Create `worker/src/routes/categories.ts`**

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

export const categories = new Hono<{ Bindings: Env }>();

// GET /api/categories
categories.get("/categories", (c) => {
  // Copy the categories array from current index.ts lines 1722-1768
  const categoriesList = [
    { id: "tech", name: "Technology", group: "Technology & Innovation" },
    // ... (copy full array from index.ts)
  ];
  return c.json({ categories: categoriesList });
});

// GET /api/cities
categories.get("/cities", (c) => {
  const cities = [
    { city: "Harare", country: "Zimbabwe" },
    { city: "Bulawayo", country: "Zimbabwe" },
    { city: "Victoria Falls", country: "Zimbabwe" },
    { city: "Johannesburg", country: "South Africa" },
    { city: "Cape Town", country: "South Africa" },
    { city: "Nairobi", country: "Kenya" },
    { city: "Lagos", country: "Nigeria" },
    { city: "Accra", country: "Ghana" },
  ];
  return c.json({ cities });
});
```

**Step 3: Create minimal new `worker/src/index.ts`**

Back up the old file as `worker/src/index.old.ts`, then write the new Hono app:

```bash
cp worker/src/index.ts worker/src/index.old.ts
```

Write new `worker/src/index.ts`:

```typescript
/**
 * nhimbe API - Cloudflare Workers (Hono)
 * Events platform with AI-powered search and recommendations
 * Part of the Mukoko ecosystem
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AnalyticsQueueMessage, EmailQueueMessage } from "./types";

// Route modules
import { health } from "./routes/health";
import { categories } from "./routes/categories";
// ... (more route imports added in subsequent tasks)

const app = new Hono<{ Bindings: Env }>();

// Global CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

// Mount route modules
app.route("/", health);
app.route("/api", categories);

// Queue handler (not part of Hono — exported alongside)
async function handleQueue(batch: MessageBatch, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (batch.queue === "nhimbe-analytics-queue") {
        await processAnalyticsMessage(message.body as AnalyticsQueueMessage, env);
      } else if (batch.queue === "nhimbe-email-queue") {
        await processEmailMessage(message.body as EmailQueueMessage, env);
      }
      message.ack();
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      message.retry();
    }
  }
}

// Queue processors (copy from old index.ts)
async function processAnalyticsMessage(message: AnalyticsQueueMessage, env: Env): Promise<void> {
  // ... (copy from old index.ts lines 393-421)
}

async function processEmailMessage(message: EmailQueueMessage, env: Env): Promise<void> {
  // ... (copy from old index.ts lines 424-438)
}

export default {
  fetch: app.fetch,
  queue: handleQueue,
};
```

**CRITICAL:** At this stage, only the health, categories, and cities routes work. The remaining routes will 404. This is intentional — we add them in the following tasks.

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd worker && npx tsc --noEmit
```

**Step 5: Verify health routes work locally**

Run:
```bash
cd worker && npx wrangler dev --port 8788 &
sleep 3
curl -s http://localhost:8788/api/health | head -5
curl -s http://localhost:8788/api/categories | head -5
curl -s http://localhost:8788/api/cities | head -5
kill %1
```
Expected: JSON responses

**Step 6: Commit**

```bash
git add worker/src/index.ts worker/src/index.old.ts worker/src/routes/
git commit -m "refactor: create Hono app shell with health and categories routes"
```

---

### Task 5: Extract events routes

**Files:**
- Create: `worker/src/routes/events.ts`
- Modify: `worker/src/index.ts` (add route import)

**Step 1: Create `worker/src/routes/events.ts`**

Copy handler logic from `index.old.ts` lines 750-940. Adapt to Hono patterns:

```typescript
import { Hono } from "hono";
import type { Env, Event } from "../types";
import { safeParseInt, safeParseJSON } from "../utils/validation";
import { generateId, generateShortCode } from "../utils/ids";
import { slugify } from "../utils/validation";
import { dbRowToEvent } from "../utils/db";
import { writeAuth } from "../middleware/auth";
import { indexEvent, removeEventFromIndex } from "../ai/embeddings";

export const events = new Hono<{ Bindings: Env }>();

// Write operations require API key or allowed origin
events.use("*", writeAuth);

// GET /api/events
events.get("/", async (c) => {
  const city = c.req.query("city");
  const category = c.req.query("category");
  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);

  let query = "SELECT * FROM events WHERE is_published = TRUE AND is_cancelled = FALSE";
  const params: unknown[] = [];

  if (city) { query += " AND location_city = ?"; params.push(city); }
  if (category) { query += " AND category = ?"; params.push(category); }

  query += " ORDER BY date_iso ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const eventsList = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));

  return c.json({ events: eventsList, pagination: { limit, offset, total: eventsList.length } });
});

// GET /api/events/trending (MUST be before /:id)
events.get("/trending", async (c) => {
  // Copy from handleTrendingEvents in index.old.ts
});

// GET /api/events/:id
events.get("/:id", async (c) => {
  const eventId = c.req.param("id");
  const result = await c.env.DB.prepare("SELECT * FROM events WHERE id = ? OR slug = ? OR short_code = ?")
    .bind(eventId, eventId, eventId)
    .first();

  if (!result) return c.json({ error: "Event not found" }, 404);
  return c.json({ event: dbRowToEvent(result as Record<string, unknown>) });
});

// POST /api/events
events.post("/", async (c) => {
  // Copy from handleEvents POST in index.old.ts
});

// PUT /api/events/:id
events.put("/:id", async (c) => {
  // Copy from handleEvents PUT in index.old.ts
});

// DELETE /api/events/:id
events.delete("/:id", async (c) => {
  // Copy from handleEvents DELETE in index.old.ts
});

// POST /api/events/:id/view
events.post("/:id/view", async (c) => {
  // Copy from handleEventView in index.old.ts
});

// GET /api/events/:id/reviews
events.get("/:id/reviews", async (c) => {
  // Copy from handleEventReviews GET in index.old.ts
});

// POST /api/events/:id/reviews
events.post("/:id/reviews", async (c) => {
  // Copy from handleEventReviews POST in index.old.ts
});

// GET /api/events/:id/stats
events.get("/:id/stats", async (c) => {
  // Copy from handleEventStats in index.old.ts
});

// GET /api/events/:id/referrals
events.get("/:id/referrals", async (c) => {
  // Copy from handleEventReferrals in index.old.ts
});
```

**IMPORTANT:** Copy the full handler logic from `index.old.ts`. Replace `jsonResponse(data, status)` with `c.json(data, status)`. Replace `request.json()` with `c.req.json()`. Replace `env` references with `c.env`.

**Step 2: Add route to `worker/src/index.ts`**

```typescript
import { events } from "./routes/events";
// ...
app.route("/api/events", events);
```

**Step 3: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add worker/src/routes/events.ts worker/src/index.ts
git commit -m "refactor: extract events routes to worker/src/routes/events.ts"
```

---

### Task 6: Extract search and AI routes

**Files:**
- Create: `worker/src/routes/search.ts`
- Create: `worker/src/routes/ai.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/routes/search.ts`**

Copy from `index.old.ts`: `handleSearch` (941-965), `handleSimilarEvents` (1096-1111), `handleRecommendations` (1035-1070).

```typescript
import { Hono } from "hono";
import type { Env, SearchQuery } from "../types";
import { searchEvents, findSimilarEvents, getRecommendations } from "../ai/search";

export const search = new Hono<{ Bindings: Env }>();

// GET /api/search
search.get("/", async (c) => {
  // Copy handleSearch logic, adapt to Hono context
});

// GET /api/similar/:id
search.get("/similar/:id", async (c) => {
  // Copy handleSimilarEvents logic
});

// GET /api/recommendations
search.get("/recommendations", async (c) => {
  // Copy handleRecommendations logic
});
```

**Step 2: Create `worker/src/routes/ai.ts`**

Copy from `index.old.ts`: `handleAssistant` (966-985), `handleDescriptionWizardSteps` (986-1000), `handleGenerateDescription` (1001-1015), `handleRegenerateDescription` (1016-1034).

```typescript
import { Hono } from "hono";
import type { Env, AssistantRequest } from "../types";
import { chat, generateSuggestions } from "../ai/assistant";
import { generateDescription, regenerateDescription, getWizardSteps, type DescriptionContext } from "../ai/description-generator";

export const ai = new Hono<{ Bindings: Env }>();

// POST /api/assistant
ai.post("/assistant", async (c) => {
  // Copy handleAssistant logic
});

// GET /api/ai/description/wizard-steps
ai.get("/ai/description/wizard-steps", async (c) => {
  // Copy handleDescriptionWizardSteps logic
});

// POST /api/ai/description/generate
ai.post("/ai/description/generate", async (c) => {
  // Copy handleGenerateDescription logic
});

// POST /api/ai/description/regenerate
ai.post("/ai/description/regenerate", async (c) => {
  // Copy handleRegenerateDescription logic
});
```

**Step 3: Mount in `worker/src/index.ts`**

```typescript
import { search } from "./routes/search";
import { ai } from "./routes/ai";
// ...
app.route("/api", search);
app.route("/api", ai);
```

**Step 4: Verify TypeScript compiles and commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/search.ts worker/src/routes/ai.ts worker/src/index.ts
git commit -m "refactor: extract search and AI routes"
```

---

### Task 7: Extract auth routes

**Files:**
- Create: `worker/src/routes/auth.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/routes/auth.ts`**

Copy from `index.old.ts`: `handleAuthSync` (1349-1438), `handleAuthMe` (1189-1239), `handleAuthOnboarding` (1240-1347).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { getAuthenticatedUser } from "../auth/stytch";
import { safeParseJSON } from "../utils/validation";
import { generateId, generateHandle } from "../utils/ids";

export const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/sync
auth.post("/sync", async (c) => {
  // Copy handleAuthSync logic
});

// GET /api/auth/me
auth.get("/me", async (c) => {
  // Copy handleAuthMe logic
});

// POST /api/auth/onboarding
auth.post("/onboarding", async (c) => {
  // Copy handleAuthOnboarding logic
});
```

**Step 2: Mount in `worker/src/index.ts`**

```typescript
import { auth } from "./routes/auth";
app.route("/api/auth", auth);
```

**Step 3: Verify and commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/auth.ts worker/src/index.ts
git commit -m "refactor: extract auth routes"
```

---

### Task 8: Extract users, registrations, and media routes

**Files:**
- Create: `worker/src/routes/users.ts`
- Create: `worker/src/routes/registrations.ts`
- Create: `worker/src/routes/media.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/routes/users.ts`**

Copy from `index.old.ts`: `handleUsers` (1138-1188). Also include user-scoped sub-routes: referral codes (2441-2496) and reputation (2497-2579).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { safeParseJSON } from "../utils/validation";
import { generateReferralCode } from "../utils/ids";

export const users = new Hono<{ Bindings: Env }>();

// GET /api/users/:id
users.get("/:id", async (c) => { /* handleUsers GET */ });

// POST /api/users/:id
users.post("/:id", async (c) => { /* handleUsers POST */ });

// GET /api/users/:id/referral-code
users.get("/:id/referral-code", async (c) => { /* handleUserReferralCode GET */ });

// POST /api/users/:id/referral-code
users.post("/:id/referral-code", async (c) => { /* handleUserReferralCode POST */ });

// GET /api/users/:id/reputation
users.get("/:id/reputation", async (c) => { /* handleHostReputation */ });
```

**Step 2: Create `worker/src/routes/registrations.ts`**

Copy from `index.old.ts`: `handleRegistrations` (1444-1622).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { generateId } from "../utils/ids";

export const registrations = new Hono<{ Bindings: Env }>();
registrations.use("*", writeAuth);

// GET /api/registrations
registrations.get("/", async (c) => { /* list registrations */ });

// POST /api/registrations
registrations.post("/", async (c) => { /* create registration */ });

// PUT /api/registrations/:id
registrations.put("/:id", async (c) => { /* update registration */ });

// DELETE /api/registrations/:id
registrations.delete("/:id", async (c) => { /* cancel registration */ });
```

**Step 3: Create `worker/src/routes/media.ts`**

Copy from `index.old.ts`: `handleMedia` (1623-1715).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";

export const media = new Hono<{ Bindings: Env }>();
media.use("*", writeAuth);

// POST /api/media/upload
media.post("/upload", async (c) => { /* upload to R2 */ });

// GET /api/media/:key
media.get("/:key", async (c) => { /* get from R2 */ });

// DELETE /api/media/:key
media.delete("/:key", async (c) => { /* delete from R2 */ });
```

**Step 4: Mount and commit**

```typescript
import { users } from "./routes/users";
import { registrations } from "./routes/registrations";
import { media } from "./routes/media";
app.route("/api/users", users);
app.route("/api/registrations", registrations);
app.route("/api/media", media);
```

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/users.ts worker/src/routes/registrations.ts worker/src/routes/media.ts worker/src/index.ts
git commit -m "refactor: extract users, registrations, and media routes"
```

---

### Task 9: Extract referrals, reviews, stats, and community routes

**Files:**
- Create: `worker/src/routes/referrals.ts`
- Create: `worker/src/routes/reviews.ts`
- Create: `worker/src/routes/stats.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/routes/referrals.ts`**

Copy `handleTrackReferral` (2386-2440).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

export const referrals = new Hono<{ Bindings: Env }>();

// POST /api/referrals/track
referrals.post("/track", async (c) => { /* handleTrackReferral */ });
```

**Step 2: Create `worker/src/routes/reviews.ts`**

Copy `handleReviewHelpful` (2213-2253).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

export const reviews = new Hono<{ Bindings: Env }>();

// POST /api/reviews/:id/helpful
reviews.post("/:id/helpful", async (c) => { /* handleReviewHelpful */ });
```

**Step 3: Create `worker/src/routes/stats.ts`**

Copy `handleCommunityStats` (2580-2676).

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

export const stats = new Hono<{ Bindings: Env }>();

// GET /api/community/stats
stats.get("/stats", async (c) => { /* handleCommunityStats */ });
```

**Step 4: Mount and commit**

```typescript
import { referrals } from "./routes/referrals";
import { reviews } from "./routes/reviews";
import { stats } from "./routes/stats";
app.route("/api/referrals", referrals);
app.route("/api/reviews", reviews);
app.route("/api/community", stats);
```

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/referrals.ts worker/src/routes/reviews.ts worker/src/routes/stats.ts worker/src/index.ts
git commit -m "refactor: extract referrals, reviews, and community stats routes"
```

---

### Task 10: Extract admin routes and seed

**Files:**
- Create: `worker/src/routes/admin.ts`
- Create: `worker/src/routes/seed.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/routes/admin.ts`**

Copy all admin handlers (lines 2870-3362) from `index.old.ts`.

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { getAdminUser } from "../middleware/auth";
import { apiKeyRequired } from "../middleware/auth";
import { dbRowToEvent } from "../utils/db";
import { indexEvents } from "../ai/embeddings";

export const admin = new Hono<{ Bindings: Env }>();

// GET /api/admin/stats
admin.get("/stats", async (c) => { /* handleAdminStats */ });

// GET /api/admin/users
admin.get("/users", async (c) => { /* handleAdminUsers */ });

// POST /api/admin/users/:id/suspend
admin.post("/users/:id/suspend", async (c) => { /* handleAdminUserAction("suspend") */ });

// POST /api/admin/users/:id/activate
admin.post("/users/:id/activate", async (c) => { /* handleAdminUserAction("activate") */ });

// POST /api/admin/users/:id/role
admin.post("/users/:id/role", async (c) => { /* handleAdminUserAction("role") */ });

// GET /api/admin/events
admin.get("/events", async (c) => { /* handleAdminEvents */ });

// DELETE /api/admin/events/:id
admin.delete("/events/:id", async (c) => { /* handleAdminDeleteEvent */ });

// POST /api/admin/index-events (API key required)
admin.post("/index-events", apiKeyRequired, async (c) => { /* handleIndexEvents */ });

// GET /api/admin/support
admin.get("/support", async (c) => { /* handleAdminSupport */ });

// PUT /api/admin/support/:id/status
admin.put("/support/:id/status", async (c) => { /* handleAdminTicketStatus */ });

// POST /api/admin/support/:id/reply
admin.post("/support/:id/reply", async (c) => { /* handleAdminTicketReply */ });
```

**Step 2: Create `worker/src/routes/seed.ts`**

Copy `handleSeedData` (1794-2075) from `index.old.ts`.

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { apiKeyRequired } from "../middleware/auth";

export const seed = new Hono<{ Bindings: Env }>();

// POST /api/admin/seed (API key required)
seed.post("/admin/seed", apiKeyRequired, async (c) => { /* handleSeedData */ });
```

**Step 3: Mount and commit**

```typescript
import { admin } from "./routes/admin";
import { seed } from "./routes/seed";
app.route("/api/admin", admin);
app.route("/api", seed);
```

```bash
cd worker && npx tsc --noEmit
git add worker/src/routes/admin.ts worker/src/routes/seed.ts worker/src/index.ts
git commit -m "refactor: extract admin and seed routes"
```

---

### Task 11: Move queue handlers

**Files:**
- Create: `worker/src/queues/handlers.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create `worker/src/queues/handlers.ts`**

```typescript
import type { Env, AnalyticsQueueMessage, EmailQueueMessage } from "../types";

export async function processAnalyticsMessage(message: AnalyticsQueueMessage, env: Env): Promise<void> {
  // Copy from index.old.ts lines 393-421
}

export async function processEmailMessage(message: EmailQueueMessage, env: Env): Promise<void> {
  // Copy from index.old.ts lines 424-438
}
```

**Step 2: Update `worker/src/index.ts` to import from queues**

```typescript
import { processAnalyticsMessage, processEmailMessage } from "./queues/handlers";
```

Remove the inline `processAnalyticsMessage` and `processEmailMessage` functions from `index.ts`.

**Step 3: Verify and commit**

```bash
cd worker && npx tsc --noEmit
git add worker/src/queues/ worker/src/index.ts
git commit -m "refactor: extract queue handlers to worker/src/queues/"
```

---

### Task 12: Update tests to import from modules

**Files:**
- Modify: `worker/src/__tests__/validation.test.ts`
- Modify: `worker/src/__tests__/security.test.ts`

The tests currently re-implement private functions. Now that utilities and middleware are exported, update tests to import directly.

**Step 1: Update `worker/src/__tests__/validation.test.ts`**

Replace the re-implemented functions at the top with imports:

```typescript
import { safeParseInt, validateRequiredFields, safeParseJSON, slugify, getInitials } from '../utils/validation';
import { generateShortCode, generateReferralCode } from '../utils/ids';
import { dbRowToEvent } from '../utils/db';
```

Remove the copy-pasted function definitions (lines 19-100 approximately).

**Step 2: Update `worker/src/__tests__/security.test.ts`**

Replace the re-implemented `isAllowedOrigin` with import:

```typescript
import { isAllowedOrigin, validateApiKey } from '../middleware/auth';
```

**Note:** The `isAllowedOrigin` in tests takes `(origin, allowedOrigins)` while the module version takes `(request, env)`. You may need to keep the test-local version or adjust the test to create mock requests. **Evaluate which approach is simpler.** If the test function signatures differ, keep the test-local versions for now and add a TODO comment.

**Step 3: Run all tests**

Run:
```bash
cd worker && npx vitest run
```
Expected: All tests PASS

**Step 4: Commit**

```bash
git add worker/src/__tests__/
git commit -m "refactor: update tests to import from extracted modules"
```

---

### Task 13: Delete old index and verify everything

**Files:**
- Delete: `worker/src/index.old.ts`
- Modify: `worker/src/index.ts` (final cleanup)

**Step 1: Run full test suite**

Run:
```bash
cd worker && npx vitest run
```
Expected: All tests PASS

**Step 2: Run type check**

Run:
```bash
cd worker && npx tsc --noEmit
```
Expected: PASS

**Step 3: Run the CI pipeline locally**

Run from root:
```bash
npm run lint && npm run build
```
Expected: PASS

**Step 4: Delete the backup**

```bash
rm worker/src/index.old.ts
```

**Step 5: Verify final `index.ts` is clean**

The final `worker/src/index.ts` should be ~50 lines: imports, app creation, middleware, route mounting, queue handler, export.

**Step 6: Final commit**

```bash
git add -A
git commit -m "refactor: complete Hono migration - remove old monolith

Migrated 3,362-line index.ts to modular Hono router:
- 12 route modules in routes/
- Shared utilities in utils/
- Auth middleware in middleware/
- Queue handlers in queues/
- All tests passing"
```

---

### Task 14: Run full CI and verify deployment readiness

**Step 1: Run full test suite from root**

```bash
npx vitest run
cd worker && npx vitest run
```
Expected: All tests PASS

**Step 2: Type check**

```bash
cd worker && npx tsc --noEmit
```
Expected: PASS

**Step 3: Lint**

```bash
npm run lint
```
Expected: PASS

**Step 4: Build frontend (confirms no import breakage)**

```bash
npm run build
```
Expected: PASS

**Step 5: Local smoke test**

```bash
cd worker && npx wrangler dev --port 8788 &
sleep 3
# Test key routes
curl -s http://localhost:8788/api/health
curl -s http://localhost:8788/api/categories
curl -s http://localhost:8788/api/events
curl -s http://localhost:8788/api/cities
kill %1
```
Expected: All return valid JSON

---

## Summary

After this plan is complete:

```
worker/src/
├── index.ts              # ~50 lines: Hono app, middleware, route mounting, queue export
├── types.ts              # (unchanged)
├── utils/
│   ├── index.ts          # barrel exports
│   ├── validation.ts     # safeParseInt, validateRequiredFields, safeParseJSON, slugify, getInitials
│   ├── ids.ts            # generateId, generateShortCode, generateReferralCode, generateHandle
│   ├── db.ts             # dbRowToEvent
│   └── response.ts       # jsonResponse (legacy), corsHeaders
├── middleware/
│   ├── index.ts          # barrel exports
│   └── auth.ts           # isAllowedOrigin, validateApiKey, writeAuth, apiKeyRequired, getAdminUser
├── routes/
│   ├── health.ts         # /, /api/health, statusPage
│   ├── categories.ts     # /api/categories, /api/cities
│   ├── events.ts         # /api/events/*, trending, reviews, stats, referrals
│   ├── search.ts         # /api/search, /api/similar, /api/recommendations
│   ├── ai.ts             # /api/assistant, /api/ai/description/*
│   ├── auth.ts           # /api/auth/sync, /api/auth/me, /api/auth/onboarding
│   ├── users.ts          # /api/users/*, referral-code, reputation
│   ├── registrations.ts  # /api/registrations/*
│   ├── media.ts          # /api/media/*
│   ├── referrals.ts      # /api/referrals/track
│   ├── reviews.ts        # /api/reviews/:id/helpful
│   ├── stats.ts          # /api/community/stats
│   ├── admin.ts          # /api/admin/*
│   └── seed.ts           # /api/admin/seed
├── queues/
│   └── handlers.ts       # processAnalyticsMessage, processEmailMessage
├── auth/
│   └── stytch.ts         # (unchanged)
└── ai/                   # (unchanged)
```

**Total route modules:** 14 files replacing 1 monolith
**Zero behavior changes** — all HTTP routes and response shapes preserved
**Foundation ready** for Phase 2 (Email/Resend), Phase 3 (Sharing), Phase 4 (Recurring Events)
