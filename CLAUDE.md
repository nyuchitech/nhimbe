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
│   ├── app/                      # App Router (pages, layouts)
│   │   ├── globals.css           # Global styles with theme system
│   │   ├── layout.tsx            # Root layout with ThemeProvider
│   │   └── page.tsx              # Landing page
│   └── components/
│       ├── layout/
│       │   ├── header.tsx        # Scroll-aware header with frosted glass
│       │   └── footer.tsx        # Footer with theme toggle
│       ├── ui/
│       │   ├── avatar.tsx        # User avatar component
│       │   ├── theme-toggle.tsx  # Dark/Light/System toggle
│       │   └── ...               # Other UI components
│       └── theme-provider.tsx    # Theme context provider
├── worker/                       # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts              # Worker entry point + status page
│   │   ├── types.ts              # TypeScript types for bindings
│   │   ├── ai/
│   │   │   ├── embeddings.ts     # Event embedding generation
│   │   │   ├── search.ts         # RAG semantic search
│   │   │   └── assistant.ts      # AI chat assistant
│   │   └── db/
│   │       └── schema.sql        # D1 database schema
│   ├── wrangler.toml             # Cloudflare configuration
│   ├── tsconfig.json             # TypeScript config for Workers
│   └── package.json              # Worker dependencies
├── docs/                         # Documentation
│   └── mukoko-navigation-system.md  # Reusable navigation components
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

### Backend (worker/ directory)

```bash
cd worker
npm install          # Install dependencies
npm run dev          # Development server (localhost:8787)
npm run deploy       # Deploy to Cloudflare
npm run tail         # View production logs
```

## Theme System

The app uses a custom theme system with three modes: Dark, Light, and System.

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ThemeProvider | `src/components/theme-provider.tsx` | React context for theme state |
| ThemeToggle | `src/components/ui/theme-toggle.tsx` | Cycling button (dark→light→system) |
| Flash Script | `src/app/layout.tsx` | Prevents theme flash on load |

### Theme Modes

- **Dark**: Optimized for low-light environments
- **Light**: Optimized for bright environments
- **System**: Follows OS preference, updates in real-time

### CSS Variables

```css
/* Dark mode */
--background: #0A0A0A;
--foreground: #F5F5F4;
--primary: #64FFDA;      /* Malachite */
--secondary: #B388FF;    /* Tanzanite */

/* Light mode */
--background: #FAFAF8;
--foreground: #171717;
--primary: #00574B;      /* Dark Malachite */
--secondary: #4B0082;    /* Dark Tanzanite */
```

## Navigation System

See `docs/mukoko-navigation-system.md` for complete documentation with copy-paste code.

### Header Features

- **Transparent at top**: No background when not scrolled
- **Frosted glass on scroll**: `backdrop-blur-xl` with theme-aware background
- **Logo → Page title**: Logo visible at top, page title when scrolled
- **Pill-shaped action group**: Primary-colored container with 44px touch targets
- **Dynamic title detection**: Static mapping + H1 element observation

### Footer Features

- **Brand + tagline**: Serif italic tagline
- **Navigation links**: About, Help, Terms, Privacy
- **Theme toggle**: Moved from header to footer
- **Mukoko attribution**: "A Mukoko Product" with link

## Accessibility

### WCAG 2.2 AAA Compliance

- **7:1 minimum contrast ratio** for all text
- **44px touch targets** for all interactive elements
- **Theme-aware colors** that maintain compliance in both modes

### Contrast Ratios (Dark Mode)

| Element | Color | Contrast |
|---------|-------|----------|
| Primary text | #F5F5F4 | 19.3:1 |
| Secondary text | #B8B8B3 | 10.4:1 |
| Tertiary text | #8A8A85 | 7.1:1 |

## Brand Guidelines (Quick Reference)

### Colors (Five African Minerals)

| Role      | Light Mode | Dark Mode |
| --------- | ---------- | --------- |
| Primary   | `#00574B`  | `#64FFDA` |
| Secondary | `#4B0082`  | `#B388FF` |
| Accent    | `#8B5A00`  | `#FFD740` |

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

### Backend (worker/.dev.vars)
```
# Secrets go here for local dev
# Use `wrangler secret put` for production
```

## API Endpoints

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/`                       | Status page (HTML)             |
| GET    | `/api/health`             | Health check                   |
| GET    | `/api/events`             | List events                    |
| POST   | `/api/events`             | Create event                   |
| GET    | `/api/events/:id`         | Get single event               |
| POST   | `/api/search`             | RAG semantic search            |
| POST   | `/api/assistant`          | AI chat assistant              |
| GET    | `/api/recommendations`    | Personalized recommendations   |
| GET    | `/api/events/:id/similar` | Find similar events            |

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
7. **Accessibility first**: Maintain WCAG 2.2 AAA compliance

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
// worker/src/index.ts - add to fetch handler
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

**Using theme context:**
```tsx
import { useTheme } from "@/components/theme-provider";

function MyComponent() {
  const { theme, resolvedTheme, cycleTheme } = useTheme();
  // theme: "dark" | "light" | "system"
  // resolvedTheme: "dark" | "light" (actual applied theme)
}
```

## Deployment

### Frontend (Vercel)
1. Connect repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` in environment variables
3. Auto-deploys on push to main

### Backend (Cloudflare)
```bash
cd worker
wrangler login
wrangler deploy
```

## Integration Notes

- Design for mobile-first (Mukoko Super App)
- APIs must be cross-platform compatible
- Follow Mukoko shared authentication when available
- Always include "A Mukoko Product" attribution
- Navigation system is reusable - see `docs/mukoko-navigation-system.md`

---

*Last updated: December 2025*
