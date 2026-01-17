# nhimbe

> Together we gather, together we grow

**nhimbe** is the gatherings and events platform within the Mukoko ecosystem. A standalone web application with integration capabilities for the Mukoko Super App.

## Tech Stack

| Layer          | Technology                              | Deployment   |
| -------------- | --------------------------------------- | ------------ |
| Frontend       | Next.js 16, React 19, Tailwind CSS v4   | Vercel       |
| Backend        | Cloudflare Workers with D1, Vectorize   | Cloudflare   |
| AI             | Workers AI (embeddings, LLM)            | Cloudflare   |
| Authentication | Stytch OAuth                            | Stytch       |
| Storage        | Cloudflare R2                           | Cloudflare   |

## Features

- **Event Management**: Create, edit, and manage events with rich details
- **AI-Powered Search**: Semantic search using vector embeddings
- **AI Description Wizard**: Generate event descriptions with AI assistance
- **Authentication**: Secure OAuth login via Stytch
- **User Onboarding**: Guided setup for new users
- **Calendar Integration**: Add events to Google, Apple, or Outlook calendars
- **Weather Display**: Real-time weather for event locations
- **Maps Integration**: Interactive maps for event venues
- **PWA Support**: Installable progressive web app
- **Dark/Light/System Themes**: Accessible, high-contrast design

## Project Structure

```text
nhimbe/
├── src/                        # Next.js frontend source
│   ├── app/                    # App Router pages and layouts
│   │   ├── auth/               # Authentication pages (signin, callback)
│   │   ├── events/             # Event pages (browse, create, details)
│   │   ├── onboarding/         # New user onboarding flow
│   │   └── ...
│   ├── components/             # React components
│   │   ├── auth/               # Auth context and guards
│   │   ├── layout/             # Header, footer
│   │   └── ui/                 # Reusable UI components
│   └── lib/                    # Utilities (api, calendar, timezone)
├── worker/                     # Cloudflare Workers backend
│   └── src/
│       ├── ai/                 # AI features (search, assistant, embeddings)
│       ├── auth/               # Stytch authentication
│       ├── db/                 # D1 schema and migrations
│       └── index.ts            # API routes
├── public/                     # Static assets and PWA manifest
├── CLAUDE.md                   # AI assistant guidelines
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm, yarn, or pnpm
- Wrangler CLI (`npm install -g wrangler`)

### Frontend Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Backend Development

```bash
# Navigate to worker directory
cd worker

# Install dependencies
npm install

# Run local development server
npm run dev

# Deploy to Cloudflare
npm run deploy

# View production logs
npm run tail
```

API runs at [http://localhost:8787](http://localhost:8787).

## Environment Setup

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_STYTCH_CLIENT_ID=your-stytch-client-id
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Backend (worker/.dev.vars)

```bash
# Copy example and edit with your values
STYTCH_PROJECT_ID=your-stytch-project-id
STYTCH_SECRET=your-stytch-secret
API_KEY=your-api-key
```

Use `wrangler secret put` for production secrets.

## Deployment

### Frontend (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Cloudflare)

```bash
cd worker
wrangler login
npm run deploy
```

## API Reference

See [CLAUDE.md](./CLAUDE.md) for complete API endpoint documentation.

## Brand Guidelines

- **Colors**: Five African Minerals palette (Malachite, Tanzanite, Gold, etc.)
- **Typography**: Noto Serif (display), Plus Jakarta Sans (body)
- **Icons**: Lucide React
- **Wordmark**: Always lowercase `nhimbe`

## CI/CD

GitHub Actions automatically runs on pull requests and pushes to main:

- **Lint & Build**: Validates frontend code
- **Worker Type Check**: Validates backend TypeScript
- **Validate Migrations**: Checks migration files are valid

Deployment is handled automatically by Cloudflare's GitHub integration.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Submit a pull request (CI will validate migrations)

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**nhimbe** is a Mukoko product by [Nyuchi Web Services](https://nyuchi.com).
