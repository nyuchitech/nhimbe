# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) is an events platform developed by Mukoko (Nyuchi Web Services). It functions as a standalone web app at nhimbe.com and integrates with the Mukoko Super App. The name comes from the Shona tradition of communal work. Tagline: *"Together we gather, together we grow"*

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4 (deployed to Vercel)
- **Backend**: Cloudflare Workers with D1 database, Vectorize, and Workers AI
- **Icons**: Lucide React

## Development Commands

### Frontend (root directory)

```bash
npm run dev          # localhost:3000
npm run build        # Production build (run before committing)
npm run lint         # ESLint
```

### Backend (worker/ directory)

```bash
cd worker
npm run dev          # localhost:8787
npm run deploy       # Deploy to Cloudflare
npm run tail         # View production logs
```

## Architecture

### Frontend (`src/`)

- **App Router**: Pages in `src/app/`, using Next.js conventions
- **API Client**: All API calls go through `src/lib/api.ts`
- **Theme System**: Three modes (dark/light/system) via `ThemeProvider` context
- **Components**: Layout in `src/components/layout/`, reusable UI in `src/components/ui/`

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Landing with featured events |
| `/events` | `events/page.tsx` | Browse all events with filters |
| `/events/[id]` | `events/[id]/page.tsx` | Event details, RSVP, share |
| `/events/[id]/manage` | `events/[id]/manage/page.tsx` | Host dashboard |
| `/events/create` | `events/create/page.tsx` | Create new event |
| `/search` | `search/page.tsx` | Search with recent/trending |
| `/profile` | `profile/page.tsx` | User settings, sign out |
| `/my-events` | `my-events/page.tsx` | User's events |
| `/calendar` | `calendar/page.tsx` | Calendar view |

### Backend (`worker/`)

- **Single entry point**: All routes in `worker/src/index.ts`
- **AI Features**: RAG search, assistant, recommendations in `worker/src/ai/`
- **Database**: D1 SQLite schema in `worker/src/db/schema.sql`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (with city/category filters) |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get single event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/events/:id/view` | Track event view |
| GET | `/api/registrations?event_id=` | Get event registrations |
| POST | `/api/registrations` | Register for event |
| PUT | `/api/registrations/:id` | Update registration status |
| DELETE | `/api/registrations/:id` | Cancel registration |
| GET | `/api/users/:id` | Get user |
| POST | `/api/users` | Create user |
| GET | `/api/categories` | List categories |
| GET | `/api/cities` | List cities |
| POST | `/api/search` | AI semantic search |
| POST | `/api/assistant` | AI chat assistant |

## Theme & Brand System

### CSS Variables (defined in `globals.css`)

| Token                        | Dark Mode | Light Mode |
| ---------------------------- | --------- | ---------- |
| `--primary` / `--malachite`  | `#64FFDA` | `#00574B`  |
| `--secondary` / `--tanzanite`| `#B388FF` | `#4B0082`  |
| `--accent` / `--gold`        | `#FFD740` | `#8B5A00`  |
| `--background`               | `#0A0A0A` | `#FAFAF8`  |
| `--foreground`               | `#F5F5F4` | `#171717`  |

### Design Tokens

- Button radius: `12px` (`--radius-button`)
- Card radius: `16px` (`--radius-card`)
- Touch targets: `44px` minimum
- Typography: Noto Serif (display), Plus Jakarta Sans (body)

### Accessibility

WCAG 2.2 AAA compliant with 7:1+ contrast ratios. All interactive elements have 44px touch targets.

## Code Conventions

### File Naming

- Components: `kebab-case.tsx`
- Types: `kebab-case.types.ts`

### React/Next.js

- Server Components by default, `'use client'` when needed
- Use `@/` path alias for imports

### Styling

- Use Tailwind with CSS variables: `bg-primary`, `text-malachite`
- Theme-aware: colors automatically adapt via CSS variables

### API Usage

```tsx
import { getEvents, createEvent, registerForEvent } from "@/lib/api";

// Fetch events
const { events } = await getEvents({ city: "Harare", limit: 20 });

// Create event
const { event } = await createEvent({ title: "...", ... });

// RSVP
await registerForEvent({ event_id: "...", user_id: "..." });
```

## Environment Variables

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Backend (`worker/.dev.vars`)

Secrets for local dev. Use `wrangler secret put` for production.

## Key Patterns

### Adding a Page

```tsx
// src/app/example/page.tsx
export default function ExamplePage() {
  return <div className="bg-background">...</div>
}
```

### Adding an API Endpoint

Add route matching in `worker/src/index.ts` fetch handler, create handler function following existing patterns.

### Using Theme

```tsx
import { useTheme } from "@/components/theme-provider";
const { theme, resolvedTheme, cycleTheme } = useTheme();
```

### Client-Side Interactivity

For interactive features in Server Components, create a separate client component:

```tsx
// my-button.tsx
"use client";
export function MyButton() { ... }

// page.tsx (Server Component)
import { MyButton } from "./my-button";
```

## Important Notes

- Wordmark is always lowercase: `nhimbe`
- Include "A Mukoko Product" attribution in footers
- Mobile-first design (Mukoko Super App integration)
- User data stored in localStorage as `nhimbe_user`
- All destructive actions require confirmation modals
