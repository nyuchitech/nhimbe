# nhimbe

> Together we gather, together we grow

**nhimbe** is the gatherings and events platform within the Mukoko ecosystem. A standalone web application with integration capabilities for the Mukoko Super App.

## Tech Stack

| Layer    | Technology                    | Deployment |
| -------- | ----------------------------- | ---------- |
| Frontend | Next.js 16, React 19, Tailwind CSS | Vercel     |
| Backend  | Cloudflare Workers            | Cloudflare |
| Database | Cloudflare D1 (planned)       | Cloudflare |

## Project Structure

```
nhimbe/
├── src/                    # Next.js frontend source
│   └── app/                # App Router pages and layouts
├── api/                    # Cloudflare Workers backend
│   └── src/                # Worker source code
├── public/                 # Static assets
├── CLAUDE.md               # AI assistant guidelines
└── nhimbe-brand-guidelines.md  # Brand identity specs
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
# Navigate to API directory
cd api

# Install dependencies
npm install

# Run local development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

API runs at [http://localhost:8787](http://localhost:8787).

## Environment Setup

### Frontend (.env.local)

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### Backend (.dev.vars)

```bash
cd api
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your values
```

## Deployment

### Frontend (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend (Cloudflare)

```bash
cd api
wrangler login
npm run deploy
```

## Brand Guidelines

See [nhimbe-brand-guidelines.md](./nhimbe-brand-guidelines.md) for complete brand identity specifications including:

- Color palette (Five African Minerals)
- Typography (Noto Serif, Plus Jakarta Sans)
- Icon system (Lucide)
- Design tokens

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` and `npm run build`
4. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**nhimbe** is a Mukoko product by [Nyuchi Web Services](https://nyuchi.com).
