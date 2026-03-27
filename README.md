# nhimbe

> Together we gather, together we grow

**nhimbe** (pronounced /ˈnhimbɛ/) is the community events discovery and management platform within the [Mukoko](https://mukoko.com) ecosystem. Named after the Shona tradition of communal work gatherings, nhimbe brings people together through events.

## Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 | Vercel |
| Backend | Hono on Cloudflare Workers | Cloudflare |
| Database | Cloudflare D1 (SQLite) | Cloudflare |
| AI | Workers AI (BGE embeddings, Llama 3.1, Qwen 3) | Cloudflare |
| Search | Cloudflare Vectorize (RAG) | Cloudflare |
| Storage | Cloudflare R2 | Cloudflare |
| Cache | Cloudflare KV | Cloudflare |
| Auth | Stytch (magic links + OTP, JWT/JWKS) | Stytch |
| Payments | Paynow (Zimbabwe mobile money) | Paynow |
| Email | Resend (transactional) | Resend |

## Features

- **Event Management** -- Create, edit, manage, and cancel events with rich details
- **AI-Powered Search** -- Semantic search using vector embeddings (RAG)
- **AI Description Wizard** -- Generate event descriptions with AI assistance
- **Authentication** -- Passwordless login via magic links and OTP (Stytch)
- **Registrations** -- RSVP with atomic capacity checks and waitlist support
- **Payments** -- Mobile money payments via Paynow (EcoCash, OneMoney, Telecash)
- **QR Check-in** -- QR code-based attendance tracking
- **Calendar Integration** -- Export to Google, Apple, Outlook calendars
- **Recurring Events** -- Series with RRULE recurrence support
- **Reviews & Referrals** -- Event ratings and referral tracking
- **Admin Dashboard** -- User management, content moderation, analytics
- **Community Stats** -- Real-time metrics, trending categories, peak times
- **PWA Support** -- Installable progressive web app
- **Dark/Light Themes** -- WCAG AAA accessible, high-contrast design
- **i18n** -- English and Shona language support

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Wrangler CLI (`npm install -g wrangler`)

### Frontend

```bash
npm install
npm run dev           # http://localhost:3000
```

### Backend

```bash
cd worker
npm install
npm run dev           # http://localhost:8787
```

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN=your-token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key

# Backend (worker/.dev.vars)
API_KEY=your-api-key
RESEND_API_KEY=your-resend-key
```

See [CLAUDE.md](./CLAUDE.md) for the full environment variable reference.

## Project Structure

```
nhimbe/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router pages (23 routes)
│   ├── components/               # React components
│   │   ├── ui/                   # 34 shadcn/Radix primitives + composites
│   │   ├── auth/                 # Auth context, guards, Stytch provider
│   │   ├── modals/               # Responsive modal sheets
│   │   ├── layout/               # Header, footer
│   │   └── error/                # Error boundaries
│   └── lib/                      # API client, i18n, utils, observability
├── worker/                       # Cloudflare Workers backend (Hono)
│   └── src/
│       ├── routes/               # 17 route modules
│       ├── ai/                   # RAG search, assistant, description wizard
│       ├── auth/                 # Stytch JWT/JWKS validation
│       ├── middleware/           # Auth, rate limit, AI safety, observability
│       ├── payments/             # Paynow provider (HMAC-SHA512 webhooks)
│       ├── email/                # Resend client, templates, queue triggers
│       ├── utils/                # Circuit breaker, retry, validation, audit
│       ├── db/                   # Schema and migrations (8 files)
│       └── __tests__/            # 283 tests across 10 files
├── .github/                      # CI workflows, issue/PR templates
├── CLAUDE.md                     # Architecture guide
├── CONTRIBUTING.md               # Contribution guidelines
├── SECURITY.md                   # Security policy
└── RELEASES.md                   # Release process
```

## Testing

```bash
# Frontend (160 tests)
npx vitest run

# Backend (283 tests)
cd worker && npx vitest run

# Type check backend
cd worker && npx tsc --noEmit

# Lint
npm run lint
```

## CI/CD

GitHub Actions runs 5 parallel jobs on every push:

1. **Lint & Build** -- ESLint + Next.js production build
2. **Frontend Tests** -- 160 Vitest tests
3. **Worker Tests** -- 283 Vitest tests
4. **Worker Type Check** -- TypeScript strict mode
5. **Validate Migrations** -- SQL file integrity

All 5 must pass before merge.

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Complete architecture guide, API reference, conventions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](./SECURITY.md) | Security policy and vulnerability reporting |
| [RELEASES.md](./RELEASES.md) | Release process and versioning |

## Security

nhimbe implements defense-in-depth security: JWT auth with JWKS validation, timing-safe comparisons, HMAC-SHA512 webhook verification, prompt injection detection, rate limiting, security headers (HSTS, CSP, X-Frame-Options), CORS restriction, audit logging, and atomic database operations.

See [SECURITY.md](./SECURITY.md) for the full security policy and how to report vulnerabilities.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code conventions, and PR guidelines.

## License

MIT License -- see [LICENSE](./LICENSE) for details.

---

**nhimbe** is a [Mukoko](https://mukoko.com) product by [Nyuchi Web Services](https://nyuchi.com).
