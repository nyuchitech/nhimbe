---
name: deploy
description: Deploy nhimbe frontend (Vercel) and/or backend (Cloudflare Worker) with pre-flight checks
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
---

Deploy nhimbe: $ARGUMENTS

## Current State
- Branch: !`git branch --show-current`
- Uncommitted changes: !`git status --short`
- Last commit: !`git log --oneline -1`

## Pre-flight Checks

Run ALL checks before deploying. If any fail, stop and report the issue.

1. **Lint**: `npm run lint`
2. **Frontend tests**: `npx vitest run`
3. **Worker tests**: `cd worker && npx vitest run`
4. **Worker type check**: `cd worker && npx tsc --noEmit`
5. **Frontend build**: `npm run build`
6. **Clean git state**: Ensure no uncommitted changes (warn if there are)

## Deployment Targets

Based on $ARGUMENTS, deploy one or both:

### Backend (Cloudflare Worker)
```bash
cd worker && npm run deploy
```
- Deploys `worker/src/index.ts` to Cloudflare Workers
- Verify with: `curl -s https://your-api-url/api/health | jq .`

### Frontend (Vercel)
- Use the Vercel CLI or push to trigger Vercel deployment
- If Vercel CLI is available: `vercel --prod`
- Otherwise: push to main branch triggers auto-deploy

## Argument Handling

| Argument | Action |
|----------|--------|
| (empty) or `all` | Deploy both backend and frontend |
| `worker` or `backend` | Deploy only the Cloudflare Worker |
| `frontend` or `vercel` | Deploy only the Vercel frontend |
| `--skip-checks` | Skip pre-flight checks (use with caution) |

## Post-deploy

After successful deployment, report:
- What was deployed
- Which pre-flight checks passed
- Any warnings encountered