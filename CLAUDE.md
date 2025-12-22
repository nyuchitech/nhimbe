# CLAUDE.md - AI Assistant Guide for nhimbe

## Project Overview

**nhimbe** (pronounced /ˈnhimbɛ/) is an events platform and hub developed by Mukoko (Nyuchi Web Services). It functions as:
- A standalone web application at nhimbe.com
- An integration module for the Mukoko Super App

The name comes from the traditional Shona practice of communal work where community members come together to help each other. Tagline: *"Together we gather, together we grow"*

## Tech Stack

| Layer    | Technology                         | Deployment |
| -------- | ---------------------------------- | ---------- |
| Frontend | Next.js 16, React 19, Tailwind CSS | Vercel     |
| Backend  | Cloudflare Workers, TypeScript     | Cloudflare |
| Database | Cloudflare D1 (planned)            | Cloudflare |
| Icons    | Lucide React                       | -          |

## Repository Structure

```
nhimbe/
├── src/                          # Next.js frontend
│   └── app/                      # App Router (pages, layouts)
│       ├── globals.css           # Global styles with brand colors
│       ├── layout.tsx            # Root layout with fonts
│       └── page.tsx              # Landing page
├── api/                          # Cloudflare Workers backend
│   ├── src/
│   │   └── index.ts              # Worker entry point
│   ├── wrangler.toml             # Cloudflare configuration
│   ├── tsconfig.json             # TypeScript config for Workers
│   └── package.json              # API dependencies
├── public/                       # Static assets
├── .env.example                  # Frontend env template
├── CLAUDE.md                     # This file
├── nhimbe-brand-guidelines.md    # Brand identity specs
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript config
└── next.config.ts                # Next.js configuration
```

## Development Commands

### Frontend (Root directory)

```bash
npm install          # Install dependencies
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend (api/ directory)

```bash
cd api
npm install          # Install dependencies
npm run dev          # Development server (localhost:8787)
npm run deploy       # Deploy to Cloudflare
npm run tail         # View production logs
```

## Brand Guidelines (Quick Reference)

### Colors (Five African Minerals)

| Role      | Light Mode | Dark Mode |
| --------- | ---------- | --------- |
| Primary   | `#004D40`  | `#64FFDA` |
| Secondary | `#4B0082`  | `#B388FF` |
| Accent    | `#5D4037`  | `#FFD740` |

### Typography

- **Display/H1**: Noto Serif (400, 700)
- **Body/UI**: Plus Jakarta Sans (300-800)
- **Wordmark**: Always lowercase `nhimbe`

### Design Tokens

- Button radius: `12px`
- Card radius: `16px`
- Input radius: `8px`
- Badge radius: `9999px` (pill)
- Touch target: `44px` minimum

## Code Conventions

### File Naming
- Components: `kebab-case.tsx` (e.g., `event-card.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `kebab-case.types.ts` (e.g., `event.types.ts`)

### TypeScript
- Strict mode enabled
- Explicit types for function parameters and returns
- Use `interface` for object shapes, `type` for unions
- Avoid `any` - use `unknown` when type is uncertain

### React/Next.js
- Functional components with hooks only
- Server Components by default, `'use client'` when needed
- Colocate styles and tests with components
- Use Next.js App Router conventions

### Tailwind CSS
- Use CSS variables defined in `globals.css`
- Reference design tokens: `rounded-[var(--radius-button)]`
- Follow brand color system: `bg-primary`, `text-malachite`

### API (Cloudflare Workers)
- RESTful endpoints under `/api/`
- JSON responses with CORS headers
- Use environment bindings for D1, KV, etc.

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Backend (api/.dev.vars)
```
# Secrets go here for local dev
# Use `wrangler secret put` for production
```

## API Endpoints

| Method | Endpoint       | Description          |
| ------ | -------------- | -------------------- |
| GET    | `/`            | API info             |
| GET    | `/api/health`  | Health check         |
| GET    | `/api/events`  | List events          |
| POST   | `/api/events`  | Create event         |

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `claude/description-sessionId` - AI-assisted work

### Commit Messages
- Present tense: "Add event creation form"
- Reference issues: "Fix date picker bug (#123)"

## AI Assistant Guidelines

When working on this codebase:

1. **Read before modifying**: Always read existing files first
2. **Follow brand guidelines**: Use correct colors, fonts, and design tokens
3. **Minimal changes**: Only make changes necessary for the task
4. **No over-engineering**: Avoid unnecessary abstractions
5. **Test builds**: Run `npm run build` before committing
6. **Environment safety**: Never hardcode secrets

### Common Patterns

**Adding a page:**
```tsx
// src/app/events/page.tsx
export default function EventsPage() {
  return <div className="bg-background">...</div>
}
```

**Adding an API endpoint:**
```typescript
// api/src/index.ts - add to fetch handler
if (url.pathname === "/api/new-endpoint") {
  return jsonResponse({ data: "..." });
}
```

**Using brand colors:**
```tsx
<button className="bg-primary text-background rounded-[var(--radius-button)]">
  Click me
</button>
```

## Deployment

### Frontend (Vercel)
1. Connect repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` in environment variables
3. Auto-deploys on push to main

### Backend (Cloudflare)
```bash
cd api
wrangler login
wrangler deploy
```

## Integration Notes

- Design for mobile-first (Mukoko Super App)
- APIs must be cross-platform compatible
- Follow Mukoko shared authentication when available
- Always include "A Mukoko Product" attribution

---

*Last updated: December 2025*
