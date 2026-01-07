# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) is an events platform developed by Mukoko (Nyuchi Web Services). It functions as a standalone web app at nhimbe.com and integrates with the Mukoko Super App. The name comes from the Shona tradition of communal work. Tagline: *"Together we gather, together we grow"*

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS v4 (deployed to Vercel)
- **Backend**: Cloudflare Workers with D1 database, Vectorize, and Workers AI
- **Authentication**: Stytch Connected Apps (OIDC) - "Sign in with Mukoko ID"
- **Storage**: Cloudflare R2 for media uploads
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
- **Auth System**: Stytch OAuth via `AuthProvider` context in `src/components/auth/`
- **Components**: Layout in `src/components/layout/`, reusable UI in `src/components/ui/`

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Landing with featured events |
| `/events` | `events/page.tsx` | Browse all events with filters |
| `/events/[id]` | `events/[id]/page.tsx` | Event details, RSVP, share, weather, map |
| `/events/[id]/manage` | `events/[id]/manage/page.tsx` | Host dashboard |
| `/events/create` | `events/create/page.tsx` | Create new event with AI wizard |
| `/search` | `search/page.tsx` | Search with recent/trending |
| `/profile` | `profile/page.tsx` | User settings, sign out |
| `/my-events` | `my-events/page.tsx` | User's events |
| `/calendar` | `calendar/page.tsx` | Calendar view |
| `/auth/signin` | `auth/signin/page.tsx` | OAuth sign-in page |
| `/auth/callback` | `auth/callback/page.tsx` | OAuth callback handler |
| `/onboarding` | `onboarding/page.tsx` | New user onboarding flow |

### Backend (`worker/`)

- **Single entry point**: All routes in `worker/src/index.ts`
- **AI Features**: RAG search, assistant, description generator in `worker/src/ai/`
- **Authentication**: Stytch Connected Apps in `worker/src/auth/`
- **Database**: D1 SQLite schema in `worker/src/db/schema.sql`

### API Endpoints

#### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (with city/category filters) |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get single event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/events/:id/view` | Track event view |

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token` | Exchange OAuth code for tokens |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/onboarding` | Complete user onboarding |
| POST | `/api/auth/logout` | Sign out user |

#### Users & Registrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user |
| POST | `/api/users` | Create user |
| GET | `/api/registrations?event_id=` | Get event registrations |
| POST | `/api/registrations` | Register for event |
| PUT | `/api/registrations/:id` | Update registration status |
| DELETE | `/api/registrations/:id` | Cancel registration |

#### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | AI semantic search |
| POST | `/api/assistant` | AI chat assistant |
| GET | `/api/recommendations` | Personalized recommendations |
| GET | `/api/similar/:id` | Find similar events |
| GET | `/api/ai/description/wizard-steps` | Get AI wizard steps |
| POST | `/api/ai/description/generate` | Generate event description |
| POST | `/api/ai/description/regenerate` | Regenerate description |

#### Media & Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/media/upload` | Upload image to R2 |
| GET | `/api/media/:key` | Serve image with transformations |
| DELETE | `/api/media/:key` | Delete image |
| GET | `/api/categories` | List categories |
| GET | `/api/cities` | List cities |
| POST | `/api/admin/seed` | Seed database (admin only) |
| POST | `/api/admin/index-events` | Reindex all events (admin only) |

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

### Authentication Usage

```tsx
import { useAuth } from "@/components/auth/auth-context";

const { user, isAuthenticated, signIn, signOut } = useAuth();

// Check auth state
if (!isAuthenticated) {
  signIn(); // Redirects to Stytch OAuth (Mukoko ID login)
}

// Access user data
console.log(user?.name, user?.email);
```

## Environment Variables

### Frontend Development (`.env.local`)

```bash
# Stytch Connected Apps OAuth Client
NEXT_PUBLIC_MUKOKO_CLIENT_ID=connected-app-test-936d1176-7374-47c9-998d-caca532d4742
NEXT_PUBLIC_MUKOKO_REDIRECT_URI=http://localhost:3005/api/auth/callback

# Mukoko ID URL (for logout redirect)
NEXT_PUBLIC_MUKOKO_ID_URL=https://id.mukoko.com

# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3005
NEXT_PUBLIC_API_URL=http://localhost:8785

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Optional
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Frontend Production (`.env.production`)

```bash
# Stytch Connected Apps OAuth Client
NEXT_PUBLIC_MUKOKO_CLIENT_ID=connected-app-live-181e2d4a-0564-4006-8062-4615fa91b950
MUKOKO_CLIENT_SECRET=secret-****pNK1
NEXT_PUBLIC_MUKOKO_REDIRECT_URI=https://nhimbe.com/api/auth/callback

# Mukoko ID URL
NEXT_PUBLIC_MUKOKO_ID_URL=https://id.mukoko.com

# App URLs
NEXT_PUBLIC_SITE_URL=https://nhimbe.com
NEXT_PUBLIC_API_URL=https://api.nhimbe.com

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
```

### Backend (`worker/.dev.vars`)

```bash
MUKOKO_CLIENT_SECRET=your-client-secret
API_KEY=your-api-key
```

Secrets for local dev. Use `wrangler secret put` for production.

## Worker Deployments

| Environment | Worker Name | URL |
| ----------- | ----------- | --- |
| Production | `mukoko-events-api` | `https://api.nhimbe.com` (custom domain) |
| Staging | `mukoko-events-api-staging` | `https://mukoko-events-api-staging.nyuchi.workers.dev` |

## Stytch OIDC Endpoints

Stytch Project ID: `project-live-86090362-2491-4ca7-9037-f7688c7699ce`

| Endpoint | URL |
| -------- | --- |
| Authorization | `https://api.stytch.com/v1/public/{project_id}/oauth2/authorize` |
| Token | `https://api.stytch.com/v1/oauth2/token` |
| UserInfo | `https://api.stytch.com/v1/oauth2/userinfo` |
| JWKS | `https://api.stytch.com/v1/sessions/jwks/{project_id}` |

### Registered Redirect URLs

**Development:**

- `http://localhost:3005/api/auth/callback`
- `http://localhost:3004/api/auth/callback`

**Production:**

- `https://nhimbe.com/api/auth/callback`

### OAuth Clients

| Environment | Client ID | Client Type |
| ----------- | --------- | ----------- |
| Development | `connected-app-test-936d1176-7374-47c9-998d-caca532d4742` | `third_party_public` |
| Production | `connected-app-live-181e2d4a-0564-4006-8062-4615fa91b950` | `first_party` |

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

### Protected Routes

```tsx
import { AuthGuard } from "@/components/auth/auth-guard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourContent />
    </AuthGuard>
  );
}
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

### Calendar Integration

```tsx
import { generateCalendarUrl } from "@/lib/calendar";

const googleUrl = generateCalendarUrl(event, "google");
const appleUrl = generateCalendarUrl(event, "apple");
const outlookUrl = generateCalendarUrl(event, "outlook");
```

## Important Notes

- Wordmark is always lowercase: `nhimbe`
- Include "A Mukoko Product" attribution in footers
- Mobile-first design (Mukoko Super App integration)
- User data stored in localStorage as `nhimbe_user`
- Auth tokens stored as HTTP-only cookies
- All destructive actions require confirmation modals
- New users must complete onboarding before accessing protected features
