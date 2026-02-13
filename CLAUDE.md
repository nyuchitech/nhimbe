# CLAUDE.md - AI Assistant Guidelines for nhimbe

> Guidelines for AI assistants working with the nhimbe codebase

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) is a community events discovery and management platform built on the Ubuntu philosophy "Together we gather, together we grow." It is part of the Mukoko ecosystem with both standalone web presence (nhimbe.com) and integration into the Mukoko Super App.

**Version:** 0.1.0 (Beta)
**Architecture:** Full-stack monorepo (Next.js frontend + Cloudflare Workers backend)

## Tech Stack

| Layer          | Technology                                    | Deployment   |
|----------------|-----------------------------------------------|--------------|
| Frontend       | Next.js 16.1.1, React 19.2.3, Tailwind CSS v4 | Vercel       |
| Backend        | Cloudflare Workers (TypeScript)               | Cloudflare   |
| Database       | Cloudflare D1 (SQLite)                        | Cloudflare   |
| Vector Search  | Cloudflare Vectorize                          | Cloudflare   |
| AI/ML          | Workers AI (embeddings, LLMs)                 | Cloudflare   |
| Auth           | Stytch Consumer SDK                           | Stytch       |
| Storage        | Cloudflare R2                                 | Cloudflare   |
| Cache          | Cloudflare KV                                 | Cloudflare   |

## Project Structure

```
nhimbe/
├── src/                           # Next.js frontend
│   ├── app/                       # App Router (file-based routing)
│   │   ├── api/                   # Route handlers (auth callbacks, OG images)
│   │   ├── auth/                  # Auth pages (signin, error)
│   │   ├── authenticate/         # Stytch magic link token exchange
│   │   ├── events/                # Event pages (browse, create, [id] details)
│   │   ├── my-events/             # User's RSVPed/hosted events
│   │   ├── search/                # AI-powered search
│   │   ├── calendar/              # Calendar view
│   │   ├── profile/               # User profile
│   │   ├── onboarding/            # New user flow
│   │   └── globals.css            # Theme system & global styles
│   ├── components/                # React components
│   │   ├── auth/                  # AuthContext, StytchProvider
│   │   ├── layout/                # Header, Footer
│   │   └── ui/                    # Reusable components (cards, badges, etc.)
│   └── lib/                       # Utilities
│       ├── api.ts                 # Centralized API client
│       ├── utils.ts               # Helper functions (cn())
│       ├── timezone.ts            # Timezone & weather
│       └── calendar.ts            # Calendar integration
├── worker/                        # Cloudflare Workers backend
│   └── src/
│       ├── index.ts               # Main API router (~2700 lines)
│       ├── types.ts               # TypeScript definitions
│       ├── auth/stytch.ts         # Stytch session JWT validation
│       ├── ai/                    # AI features
│       │   ├── search.ts          # RAG semantic search
│       │   ├── assistant.ts       # AI chat (Shamwari)
│       │   ├── embeddings.ts      # Vector embeddings
│       │   └── description-generator.ts
│       └── db/
│           ├── schema.sql         # Database schema
│           ├── seed.sql           # Sample data
│           └── migrations/        # Schema migrations
├── public/                        # Static assets, PWA manifest
├── nhimbe-brand-guidelines.md     # Brand & design system
└── package.json                   # Frontend dependencies
```

## Development Commands

### Frontend (root directory)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Backend (worker/ directory)

```bash
cd worker
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:8787)
npm run deploy       # Deploy to Cloudflare
npm run tail         # View production logs
npm run types        # Generate TypeScript types
```

## Code Conventions

### TypeScript

- **Strict mode** enabled in both frontend and backend
- Use interfaces for all entities (Event, User, Registration, etc.)
- Type definitions in `worker/src/types.ts` for backend
- Prefer `type` for unions/intersections, `interface` for objects

### React Components

- Use **functional components** with hooks
- Add `"use client"` directive for interactive components
- Use **PascalCase** for component names, **kebab-case** for files
- Prefer composition over inheritance
- Keep components small and focused

### Styling

- **Tailwind CSS** with utility-first approach
- Use `cn()` helper from `lib/utils.ts` for conditional classes
- CSS variables for design tokens in `globals.css`
- Support dark/light modes via `.dark` and `.light` classes
- **WCAG AAA** compliance (7:1 contrast ratio)

### State Management

- **React Context** for global state (AuthProvider, ThemeProvider)
- **useState/useReducer** for component state
- No external state libraries (Redux, Zustand)

### API Client Pattern

All API calls go through `src/lib/api.ts`:
```typescript
// Example: fetching events
export async function getEvents(params?: EventParams): Promise<Event[]> {
  const response = await fetch(`${API_URL}/api/events?${queryString}`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}
```

### Backend Handler Pattern

URL-based routing in `worker/src/index.ts`:
```typescript
if (url.pathname === "/api/events" && request.method === "GET") {
  return handleGetEvents(request, env);
}

async function handleGetEvents(request: Request, env: Env): Promise<Response> {
  // Implementation
  return jsonResponse(data, 200);
}
```

## Database Schema (D1 SQLite)

### Core Tables

| Table          | Purpose                              |
|----------------|--------------------------------------|
| events         | Event details, location, host info   |
| users          | User profiles, preferences           |
| registrations  | Event RSVPs (event-user mapping)     |
| follows        | User follow relationships            |
| themes         | Mineral theme gradients              |

### Analytics Tables

| Table           | Purpose                    |
|-----------------|----------------------------|
| event_views     | Page view tracking         |
| search_queries  | Search analytics           |
| ai_conversations| AI chat history            |

### Open Data Tables (migrations/)

| Table               | Purpose                     |
|---------------------|-----------------------------|
| event_reviews       | Ratings & comments          |
| review_helpful_votes| Helpfulness voting          |
| referrals           | Referral tracking           |
| host_stats          | Aggregated host metrics     |

## API Endpoints

### Public (No Auth)

```
GET  /api/events              # List events (pagination, filters)
GET  /api/events/:id          # Event details
GET  /api/events/:id/reviews  # Event reviews
POST /api/events/:id/view     # Track view
GET  /api/similar/:id         # Similar events
POST /api/search              # Semantic search
GET  /api/recommendations     # Personalized recommendations
GET  /api/categories          # Event categories
GET  /api/cities              # Available cities
POST /api/assistant           # AI chat
```

### Protected (Auth Required)

```
POST   /api/events            # Create event
PUT    /api/events/:id        # Update event
DELETE /api/events/:id        # Delete event
POST   /api/registrations     # RSVP to event
DELETE /api/registrations/:id # Cancel RSVP
POST   /api/events/:id/reviews# Submit review
POST   /api/media/upload      # Upload media
```

### Auth Endpoints

```
POST /api/auth/sync           # Sync Stytch session with backend user
GET  /api/auth/me             # Current user
POST /api/auth/logout         # Logout
POST /api/auth/onboarding     # Complete onboarding
```

## Brand Guidelines

### Wordmark

Always lowercase: **nhimbe** (even at sentence start)

### Color Palette (Five African Minerals)

| Role      | Mineral   | Light Mode | Dark Mode |
|-----------|-----------|------------|-----------|
| Primary   | Malachite | `#004D40`  | `#64FFDA` |
| Secondary | Tanzanite | `#4B0082`  | `#B388FF` |
| Accent    | Gold      | `#5D4037`  | `#FFD740` |

### Typography

- **Display (H1):** Noto Serif
- **Headings (H2-H6):** Plus Jakarta Sans (600-800)
- **Body:** Plus Jakarta Sans (300-600)

### Design Tokens

- Button radius: 12px
- Card radius: 16px
- Input radius: 8px
- Badge radius: 9999px (pill)
- Touch target: 44px minimum

## Environment Variables

### Frontend (.env.local)

```bash
NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN=public-token-live-xxxxx
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
```

### Backend (worker/.dev.vars)

```bash
ENVIRONMENT=development
API_KEY=your-api-key
STYTCH_PROJECT_ID=your-project-id
STYTCH_SECRET=your-secret
```

## Cloudflare Bindings

| Binding   | Type            | Purpose                      |
|-----------|-----------------|------------------------------|
| AI        | Workers AI      | LLMs, embeddings             |
| VECTORIZE | Vectorize       | Semantic search              |
| DB        | D1              | SQLite database              |
| CACHE     | KV              | Caching                      |
| MEDIA     | R2              | File storage                 |
| IMAGES    | Images          | Image transformations        |
| ANALYTICS | Analytics Engine| Real-time analytics          |

## Key Features & Implementation

### AI-Powered Search (RAG)

- Location: `worker/src/ai/search.ts`
- Uses BGE-base-en-v1.5 embeddings
- Vectorize for semantic search
- Llama 3.1 8B for result summaries
- Metadata filtering by city, category, date

### AI Description Wizard

- Location: `worker/src/ai/description-generator.ts`
- Step-by-step wizard flow
- Category-specific questions
- Qwen 3 30B for generation

### Authentication

- Stytch Consumer SDK with email magic links and OTP
- Stytch session JWT validation on backend
- Session managed by Stytch SDK (automatic cookie handling)
- Backend sync via `/api/auth/sync` after authentication

## Common Tasks

### Adding a New API Endpoint

1. Add handler function in `worker/src/index.ts`
2. Add route matching in the main fetch handler
3. Update types in `worker/src/types.ts` if needed
4. Add client function in `src/lib/api.ts`

### Adding a New Page

1. Create `page.tsx` in `src/app/[route]/`
2. Add `"use client"` if interactive
3. Use existing components from `src/components/ui/`
4. Follow existing patterns for data fetching

### Running Database Migrations

```bash
cd worker
wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/your-migration.sql
```

### Adding a New Component

1. Create in `src/components/ui/` for reusable components
2. Export from `src/components/ui/index.ts`
3. Use Tailwind + cn() for styling
4. Support dark/light modes

## Testing

**Current state:** No test framework configured

**Recommended approach:**
- Use Vitest for unit tests
- React Testing Library for components
- Playwright for E2E tests

## Important Files to Know

| File                              | Purpose                          |
|-----------------------------------|----------------------------------|
| `src/lib/api.ts`                  | All frontend API calls           |
| `src/components/auth/auth-context.tsx` | Auth state management      |
| `worker/src/index.ts`             | All backend API routes           |
| `worker/src/types.ts`             | Backend type definitions         |
| `worker/src/db/schema.sql`        | Database schema                  |
| `src/app/globals.css`             | Theme variables, global styles   |
| `worker/wrangler.toml`            | Cloudflare configuration         |

## Deployment

### Frontend (Vercel)

- Auto-deploy on push to main
- Set environment variables in Vercel dashboard

### Backend (Cloudflare)

```bash
cd worker
wrangler login
npm run deploy                    # Production
npm run deploy --env staging      # Staging
```

## Security Considerations

- Stytch session JWT validation on all protected endpoints
- API key required for write operations
- CORS whitelist in backend
- Input sanitization
- No secrets in code (use .dev.vars)

## Accessibility

- WCAG 2.2 AAA compliant
- 7:1+ contrast ratios
- Keyboard navigation support
- Screen reader compatible (semantic HTML, ARIA)
- System theme preference support

---

*nhimbe is a Mukoko product by Nyuchi Web Services*
