# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) is an events platform developed by Mukoko (Nyuchi Web Services). It functions as a standalone web app at nhimbe.com and integrates with the Mukoko Super App. The name comes from the Shona tradition of communal work.

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
- **Theme System**: Three modes (dark/light/system) via `ThemeProvider` context in `src/components/theme-provider.tsx`. Theme stored in localStorage as `nhimbe-theme`. Flash prevention script in `layout.tsx`.
- **Components**: Layout components in `src/components/layout/`, reusable UI in `src/components/ui/`

### Backend (`worker/`)

- **Single entry point**: All routes handled in `worker/src/index.ts` via path matching
- **AI Features**: RAG semantic search, AI assistant, recommendations in `worker/src/ai/`
- **Database**: D1 SQLite schema in `worker/src/db/schema.sql`
- **Bindings**: `Env` type in `worker/src/types.ts` defines AI, VECTORIZE, DB, CACHE bindings

### API Route Pattern

Routes are matched with string/regex in the worker fetch handler:

```typescript
if (url.pathname === "/api/events" && method === "GET") { ... }
if (url.pathname.startsWith("/api/events")) { ... }
const match = url.pathname.match(/^\/api\/events\/([^/]+)$/);
```

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

- Use Tailwind with CSS variables: `bg-primary`, `text-malachite`, `rounded-[var(--radius-button)]`
- Theme-aware: colors automatically adapt via CSS variables

### Worker API

- All responses via `jsonResponse()` helper with CORS headers
- Convert DB rows to typed objects with `dbRowToEvent()` pattern

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

## Important Notes

- Wordmark is always lowercase: `nhimbe`
- Include "A Mukoko Product" attribution in footers
- Mobile-first design (Mukoko Super App integration)
