# Release Process

nhimbe uses continuous deployment with manual version tagging for milestones.

## Deployment

### Frontend (Vercel)

Deploys automatically on push to `main`:
- Preview deployments for all PRs
- Production deployment on merge to `main`
- Rollback available via Vercel dashboard

### Backend (Cloudflare Workers)

```bash
cd worker && npm run deploy
```

Deploy manually after merging backend changes. Cloudflare Workers supports instant rollback via the dashboard.

### Database Migrations

Run migrations manually before deploying code that depends on schema changes:

```bash
cd worker && wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/NNN_description.sql
```

**Important**: Always run migrations before deploying the code that uses them.

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking API changes, major platform shifts
- **MINOR** (0.X.0): New features, non-breaking additions
- **PATCH** (0.0.X): Bug fixes, security patches, documentation

## Creating a Release

1. Ensure `main` is stable and all CI checks pass

2. Create a git tag:
   ```bash
   git tag -a v1.0.0 -m "v1.0.0: Launch release"
   git push origin v1.0.0
   ```

3. Create a GitHub Release:
   - Go to Releases > Draft a new release
   - Select the tag
   - Write release notes following the format below
   - Publish

### Release Notes Format

```markdown
## What's New
- Feature description (#PR)

## Bug Fixes
- Fix description (#PR)

## Security
- Security improvement (#PR)

## Infrastructure
- CI/deployment changes (#PR)

## Breaking Changes
- Description of what changed and migration steps
```

## Hotfix Process

For critical production issues:

1. Create a branch from `main`: `hotfix/description`
2. Fix the issue with minimal changes
3. Add a test that covers the fix
4. Open a PR, get review, merge
5. Deploy immediately
6. Tag a patch release

## Pre-Launch Checklist

Before any major release:

- [ ] All CI checks passing (lint, build, frontend tests, worker tests, type check, migrations)
- [ ] Security audit completed (no high-severity vulnerabilities)
- [ ] Database migrations applied to production
- [ ] Environment variables and secrets configured
- [ ] Rate limiting and CORS verified for production domains
- [ ] Health endpoint responding (`/api/health`)
- [ ] Email sending verified (Resend API key set)
- [ ] Payment webhook URL configured (Paynow)
- [ ] DNS and custom domains configured
- [ ] Monitoring and alerting set up
