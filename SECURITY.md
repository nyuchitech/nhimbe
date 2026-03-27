# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |
| Older releases | No |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing **security@nyuchi.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Security Measures

nhimbe implements the following security controls:

### Authentication & Authorization
- JWT validation via Stytch JWKS (no API secrets stored in client)
- Timing-safe API key comparison to prevent timing attacks
- Suspended user enforcement (403 on all authenticated routes)
- writeAuth middleware for all mutating operations (origin check + API key)
- Role-based access control (user, moderator, admin, super_admin)

### Input Validation & Sanitization
- AI safety middleware with prompt injection detection on all AI routes
- Input length enforcement and content sanitization
- Parameterized SQL queries (no string concatenation)
- File upload validation (type whitelist, 10MB size limit)

### Transport & Headers
- HTTPS enforced via HSTS (max-age=63072000, includeSubDomains, preload)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (clickjacking protection)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- CORS restricted to trusted domains (nyuchi.com, mukoko.com, nhimbe.com)

### Data Protection
- Soft deletes with PII anonymization on account deletion
- Audit logging for all destructive operations
- No error details leaked in production responses (generic error + request ID)
- Environment validation on startup (missing bindings logged as errors)

### Payments
- Paynow webhook signature verification (HMAC-SHA512, timing-safe comparison)
- Payment secrets stored via Cloudflare `wrangler secret put` (not in code or config)

### Resilience
- Rate limiting on all API endpoints (100 req/min)
- Circuit breaker pattern for external service calls (Stytch, Vectorize, AI, R2)
- Request timeout handling
- Atomic database operations for race condition prevention (e.g., registration capacity)

## Dependency Management

- Dependencies are audited regularly with `npm audit`
- Security patches are applied promptly
- Worker dependencies: 0 known vulnerabilities
- Frontend dependencies: monitored via Dependabot

## Scope

The following are in scope for security reports:
- Authentication and authorization bypasses
- Injection vulnerabilities (SQL, XSS, prompt injection)
- Data exposure or leakage
- CORS misconfigurations
- Payment processing vulnerabilities
- Rate limiting bypasses

Out of scope:
- Denial of service (handled by Cloudflare)
- Social engineering
- Issues in third-party services (Stytch, Cloudflare, Vercel)
