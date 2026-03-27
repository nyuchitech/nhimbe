# Contributing to nhimbe

nhimbe is the community events platform within the Mukoko ecosystem. We welcome contributions that improve the platform for our users across Africa and beyond.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Wrangler CLI (`npm install -g wrangler`)

### Local Development

```bash
# Frontend
npm install && npm run dev        # http://localhost:3000

# Backend
cd worker && npm install && npm run dev   # http://localhost:8787
```

### Environment Variables

Copy the example files and fill in your values:

```bash
# Frontend
cp .env.example .env.local

# Backend
cp worker/.dev.vars.example worker/.dev.vars
```

See [CLAUDE.md](./CLAUDE.md) for the full list of required environment variables.

## Development Workflow

1. **Create a branch** from `main` with a descriptive name:
   - `feat/event-reminders` for new features
   - `fix/registration-race-condition` for bug fixes
   - `docs/update-api-reference` for documentation

2. **Make your changes** following the conventions below.

3. **Run checks locally** before pushing:
   ```bash
   npm run lint                          # ESLint
   npm run build                         # Next.js build
   npx vitest run                        # Frontend tests (160 tests)
   cd worker && npx tsc --noEmit         # Worker type check
   cd worker && npx vitest run           # Worker tests (283 tests)
   ```

4. **Push and open a pull request** against `main`. CI runs 5 parallel jobs that must all pass.

## Code Conventions

- **TypeScript strict mode** in both frontend and backend
- **Brand**: Always lowercase "nhimbe" -- even at sentence start
- **Tailwind CSS v4** with `cn()` helper for conditional classes
- **`"use client"`** directive required for interactive React components
- **WCAG AAA** compliance -- 7:1+ contrast ratios, 44px touch targets
- **Structured logging** -- `[mukoko]` prefix on all log output
- **No hardcoded data** -- categories, cities, stats all come from the database
- **Schema.org alignment** -- events and users modeled after schema.org specs
- **Path alias** -- `@/*` maps to `./src/*` in frontend imports

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the complete architecture guide including:
- Backend routing (17 Hono route modules)
- Authentication flow (Stytch JWT)
- Database schema (D1/SQLite)
- AI features (RAG search, description wizard)
- Resilience patterns (circuit breaker, retry with backoff)

## Testing

### Frontend Tests

```bash
npx vitest run                          # All frontend tests
npx vitest run src/lib/api.test.ts      # Single file
```

Tests use Vitest + jsdom + React Testing Library. Config: `vitest.config.ts`.

### Backend Tests

```bash
cd worker && npx vitest run                              # All worker tests
cd worker && npx vitest run src/__tests__/auth.test.ts   # Single file
```

Tests use Vitest with a 4-layer mock architecture. Config: `worker/vitest.config.ts`.

### Writing Tests

- Frontend tests colocate with modules (`src/lib/api.test.ts`) or live in `src/__tests__/`
- Backend tests live in `worker/src/__tests__/`
- Use the mock helpers in `worker/src/__tests__/mocks.ts` for backend tests
- Test files are excluded from `worker/tsconfig.json` (type check only covers production code)

## Database Migrations

Migrations are plain SQL files in `worker/src/db/migrations/`. D1 is SQLite.

```bash
# Run a migration
cd worker && wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/NNN_description.sql
```

Naming: `NNN_description.sql` where NNN is the next sequential number (currently at 008).

Conventions:
- Use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency
- IDs are `TEXT PRIMARY KEY` (application-generated)
- Timestamps are `TEXT DEFAULT (datetime('now'))` (ISO 8601)
- Index naming: `idx_tableName_field`

## Pull Request Guidelines

- Keep PRs focused -- one feature or fix per PR
- Write a clear description of what changed and why
- Include test coverage for new functionality
- Update `CLAUDE.md` if the architecture changes
- All 5 CI checks must pass before merge

## Reporting Issues

Use the [GitHub issue templates](.github/ISSUE_TEMPLATE/) for:
- Bug reports
- Feature requests

## Security

See [SECURITY.md](./SECURITY.md) for reporting security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
