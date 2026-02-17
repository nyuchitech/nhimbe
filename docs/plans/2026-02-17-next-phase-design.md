# nhimbe Next Phase Design

**Date:** 2026-02-17
**Status:** Approved
**Approach:** Architecture First — refactor backend before adding features

## Goals

Continue building nhimbe with focus on:
1. Backend architecture refactor (Hono migration)
2. Email notifications (Resend)
3. Social sharing & invites (WhatsApp-first)
4. Recurring events & series
5. Payment infrastructure preparation (Zimbabwean provider TBD)

Cross-cutting priorities: performance, SEO, accessibility, scalability — addressed as each area is touched.

Timeline: No fixed deadline — quality over speed.

---

## Phase 1: Backend Refactor (Foundation)

### Problem

`worker/src/index.ts` is 3,362 lines containing 33 handler functions, 50+ route matches, shared utilities, and queue handlers. This monolith slows development velocity and makes testing individual domains difficult.

### Solution: Hono Migration

Replace manual URL matching with [Hono](https://hono.dev/) — a lightweight, Workers-native router framework with built-in middleware, route groups, and TypeScript support.

### Target Structure

```
worker/src/
├── index.ts              # ~30 lines: app creation, middleware, route mounting
├── types.ts              # (exists) shared types
├── middleware/
│   ├── auth.ts           # JWT auth middleware, API key middleware, origin check
│   └── validation.ts     # safeParseInt, validateRequiredFields, safeParseJSON
├── routes/
│   ├── events.ts         # CRUD + view tracking + trending
│   ├── search.ts         # search, similar, recommendations
│   ├── ai.ts             # assistant, description wizard
│   ├── auth.ts           # sync, me, onboarding
│   ├── users.ts          # user CRUD
│   ├── registrations.ts  # registration CRUD
│   ├── media.ts          # upload, get, delete
│   ├── reviews.ts        # reviews + helpful votes
│   ├── referrals.ts      # referrals, tracking, codes
│   ├── stats.ts          # event stats, host reputation, community
│   ├── admin.ts          # all admin endpoints
│   └── seed.ts           # seed data
├── queues/
│   └── handlers.ts       # analytics + email queue processing
├── auth/
│   └── stytch.ts         # (exists) JWT validation
└── ai/                   # (exists) search, assistant, embeddings, description-generator
```

### Entry Point (index.ts)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { events } from './routes/events'
import { auth } from './routes/auth'
import { search } from './routes/search'
import { ai } from './routes/ai'
import { users } from './routes/users'
import { registrations } from './routes/registrations'
import { media } from './routes/media'
import { reviews } from './routes/reviews'
import { referrals } from './routes/referrals'
import { stats } from './routes/stats'
import { admin } from './routes/admin'
import { seed } from './routes/seed'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}))

app.route('/api/events', events)
app.route('/api/auth', auth)
app.route('/api/search', search)
app.route('/api/ai', ai)
app.route('/api/users', users)
app.route('/api/registrations', registrations)
app.route('/api/media', media)
app.route('/api/reviews', reviews)
app.route('/api/referrals', referrals)
app.route('/api/community', stats)
app.route('/api/admin', admin)
app.route('/api', seed)

export default app
```

### Route Module Pattern

Each route module exports a Hono sub-app:

```typescript
// worker/src/routes/events.ts
import { Hono } from 'hono'
import type { Env } from '../types'

export const events = new Hono<{ Bindings: Env }>()

events.get('/', async (c) => { /* list events */ })
events.get('/trending', async (c) => { /* trending events */ })
events.get('/:id', async (c) => { /* get event by id */ })
events.post('/', async (c) => { /* create event */ })
events.put('/:id', async (c) => { /* update event */ })
events.delete('/:id', async (c) => { /* delete event */ })
events.post('/:id/view', async (c) => { /* track view */ })
events.get('/:id/reviews', async (c) => { /* event reviews */ })
events.get('/:id/stats', async (c) => { /* event stats */ })
events.get('/:id/referrals', async (c) => { /* event referrals */ })
```

### Middleware

```typescript
// worker/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { getAuthenticatedUser } from '../auth/stytch'

// JWT authentication middleware
export const jwtAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const result = await getAuthenticatedUser(c.req.raw, c.env)
  if (!result.authenticated) {
    return c.json({ error: 'Unauthorized', reason: result.failureReason }, 401)
  }
  c.set('user', result.user)
  await next()
})

// API key validation middleware
export const apiKeyAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '')
  if (apiKey !== c.env.API_KEY) {
    return c.json({ error: 'Invalid API key' }, 403)
  }
  await next()
})

// Origin check middleware
export const originAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!isAllowedOrigin(c.req.raw, c.env)) {
    return c.json({ error: 'Origin not allowed' }, 403)
  }
  await next()
})
```

### Key Decisions

- **No behavior changes** — pure refactor. All HTTP routes, request/response shapes, and error codes stay identical.
- **Hono's `cors()` middleware** replaces the manual `corsHeaders` object.
- **Route params** (`c.req.param('id')`) replace regex matching.
- **Middleware chains** replace repeated auth checks at the top of handlers.
- **All 333+ tests must pass** after refactor — same integration test approach via request/response.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Route order matters (e.g., `/trending` vs `/:id`) | Define specific routes before parameterized ones |
| Queue handlers use different export pattern | Hono supports `export default { fetch, queue, scheduled }` |
| Tests import from `index.ts` | Update imports or re-export app |

---

## Phase 2: Email Notifications (Resend)

### Integration Architecture

Resend sends transactional emails. Uses the existing `EMAIL_QUEUE` binding and `EmailQueueMessage` type for async processing.

### Email Types

| Trigger | Email | Priority |
|---------|-------|----------|
| Registration confirmed | "You're registered for [Event]" | P0 |
| Event reminder (24h) | "Reminder: [Event] is tomorrow" | P0 |
| Event cancelled | "[Event] has been cancelled" | P0 |
| Registration cancelled | "You've cancelled your registration" | P1 |
| New review on event | "Someone reviewed [Event]" | P1 |
| Host: new registration | "[Name] registered for your event" | P1 |

### File Structure

```
worker/src/email/
├── resend.ts          # Resend API client
├── templates.ts       # Email templates (HTML + plain text)
└── triggers.ts        # Queue message producers
```

### Flow

1. Handler action (e.g., registration created) calls `triggers.enqueueRegistrationConfirmation()`
2. Trigger pushes `EmailQueueMessage` to `EMAIL_QUEUE`
3. Queue handler dequeues, calls `resend.send()` with rendered template
4. Resend API delivers email

### Configuration

- `RESEND_API_KEY` added to `worker/.dev.vars` and Cloudflare secrets
- Sender domain: configurable (e.g., `notifications@nhimbe.com`)
- Unsubscribe: email preference stored in `users` table (new column `email_preferences JSON`)

### Scheduled Reminders

Cloudflare Workers scheduled handler (cron trigger) runs daily:
1. Query events happening in next 24 hours
2. Query registrations for those events
3. Enqueue reminder emails for each attendee

---

## Phase 3: Social Sharing & Invites

### WhatsApp-First Strategy

Zimbabwe is WhatsApp-dominant. Sharing is optimized for WhatsApp with fallback to Web Share API.

### Features

1. **Share event link** — Deep link (`/e/[shortCode]`) with referral tracking + OG metadata
2. **WhatsApp share** — Pre-formatted message: event title, date, location, link
3. **Copy link** — Click-to-copy with visual feedback
4. **Web Share API** — Native share sheet on mobile
5. **Invite friends** — Share with user's referral code embedded in URL

### Components

```
src/components/ui/
├── share-button.tsx       # Share dropdown (WhatsApp, Copy, Native Share)
├── invite-friends.tsx     # Invite flow with referral code
```

### WhatsApp Deep Link Format

```
https://wa.me/?text=Check%20out%20this%20event%3A%20%0A%0A{title}%0A{date}%20%E2%80%A2%20{location}%0A%0A{url}
```

### OG Metadata Enhancements

Ensure `/api/og/route.tsx` generates cards optimized for:
- WhatsApp (1200x630px, `og:image`, `og:title`, `og:description`)
- Twitter Cards (`twitter:card`, `twitter:image`)
- General social (Open Graph standard tags)

### Backend

Mostly frontend work. Backend already supports:
- Short codes (`/e/[shortCode]`)
- Referral tracking (`/api/referrals/track`)
- User referral codes (`/api/users/:id/referral-code`)

---

## Phase 4: Recurring Events & Series

### Data Model

```sql
CREATE TABLE event_series (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL,  -- RFC 5545 RRULE
  host_id TEXT NOT NULL,
  template_event_id TEXT,
  max_occurrences INTEGER DEFAULT 52,
  ends_at TEXT,                    -- series end date (optional)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (host_id) REFERENCES users(id)
);

ALTER TABLE events ADD COLUMN series_id TEXT REFERENCES event_series(id);
ALTER TABLE events ADD COLUMN series_index INTEGER;
```

### RRULE Examples

- Weekly Saturday: `FREQ=WEEKLY;BYDAY=SA`
- Monthly 15th: `FREQ=MONTHLY;BYMONTHDAY=15`
- Biweekly Wednesday: `FREQ=WEEKLY;INTERVAL=2;BYDAY=WE`
- Custom: `FREQ=WEEKLY;BYDAY=MO,WE,FR` (3x per week)

### API Endpoints

```
POST   /api/series              # Create series + generate initial events
GET    /api/series/:id          # Get series details
PUT    /api/series/:id          # Update series template (affects future events)
DELETE /api/series/:id          # Cancel series (cancel all future events)
GET    /api/series/:id/events   # List events in series
```

### Occurrence Generation

1. Host creates series with RRULE + base event details
2. System generates next N occurrences (default: next 4 weeks) as real `events` rows
3. Each generated event is independently editable
4. Cron trigger generates future occurrences weekly (look-ahead window: 4 weeks)

### Frontend

- Series toggle in event creation form
- Recurrence picker (weekly/biweekly/monthly + day selection)
- Series management page showing all occurrences
- "Part of a series" badge on event cards

---

## Phase 5: Payment Infrastructure (Future-Ready)

### Provider Evaluation

| Provider | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Paynow** | Most popular in Zim, EcoCash/OneMoney/Telecash/Visa/Mastercard | Older API style | Best for broadest coverage |
| **Pesepay** | Modern REST API, webhooks, good docs | Smaller market share | Best developer experience |
| **DPO Pay** | Pan-African, international cards | Complex, higher fees | Best for international |

**Recommendation:** Start with Paynow for broadest mobile money coverage in Zimbabwe. Pesepay as alternative if Paynow's API proves difficult.

### Abstraction Layer

```
worker/src/payments/
├── types.ts           # PaymentProvider interface, PaymentIntent, PaymentResult
├── provider.ts        # Provider abstraction (swap implementations)
├── webhooks.ts        # Payment status callbacks
```

### Data Model (when implemented)

```sql
ALTER TABLE events ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN ticket_price_cents INTEGER;
ALTER TABLE events ADD COLUMN currency TEXT DEFAULT 'USD';

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT DEFAULT 'pending',  -- pending, completed, failed, refunded
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (registration_id) REFERENCES registrations(id)
);
```

---

## Phase Sequencing

```
Phase 1: Backend Refactor (Hono)
  └── Phase 2: Email Notifications (Resend)
       └── Phase 3: Social Sharing & Invites
            └── Phase 4: Recurring Events & Series
                 └── Phase 5: Payment Infrastructure (when ready)
```

Each phase builds on the previous. The Hono refactor makes all subsequent phases cleaner. Email enables event reminders and series notifications. Sharing drives discovery. Recurring events and payments extend the platform's capabilities.
