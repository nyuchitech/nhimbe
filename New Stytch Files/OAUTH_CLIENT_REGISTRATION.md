# nhimbe.com OAuth Client Registration (Stytch Connected Apps)

## Register in Stytch Dashboard

**URL:** https://stytch.com/dashboard → Select "Mukoko Identity" → Connected Apps

### Step 1: Create OAuth Client

1. Go to **Connected Apps** section
2. Click **Create OAuth Client**
3. Fill in:

```
Client Name: Nhimbe
Client Type: Confidential (server-side app)

Redirect URIs:
  - http://localhost:3005/api/auth/callback
  - http://localhost:3004/api/auth/callback
  - https://nhimbe.com/api/auth/callback

Allowed Scopes:
  ✓ openid
  ✓ profile
  ✓ email
```

4. Click **Create**

### Step 2: Save Credentials

After creation, you'll receive:
- **Client ID**: `connected-app-xxxxxx`
- **Client Secret**: `secret-xxxxxx`

⚠️ **Save the Client Secret immediately** - it won't be shown again!

---

## Environment Variables

### Development (`.env.local`)

```bash
# Stytch Connected Apps OAuth Client
NEXT_PUBLIC_MUKOKO_CLIENT_ID=connected-app-xxxxxx
MUKOKO_CLIENT_SECRET=secret-xxxxxx

# Redirect URI (must match Stytch registration)
NEXT_PUBLIC_MUKOKO_REDIRECT_URI=http://localhost:3005/api/auth/callback

# Mukoko ID URL (for logout redirect)
NEXT_PUBLIC_MUKOKO_ID_URL=https://id.mukoko.com

# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3005
NEXT_PUBLIC_API_URL=http://localhost:8785

# Environment
NEXT_PUBLIC_ENVIRONMENT=development
```

### Production (`.env.production`)

```bash
# Stytch Connected Apps OAuth Client
NEXT_PUBLIC_MUKOKO_CLIENT_ID=connected-app-xxxxxx
MUKOKO_CLIENT_SECRET=secret-xxxxxx

# Redirect URI
NEXT_PUBLIC_MUKOKO_REDIRECT_URI=https://nhimbe.com/api/auth/callback

# Mukoko ID URL
NEXT_PUBLIC_MUKOKO_ID_URL=https://id.mukoko.com

# App URLs
NEXT_PUBLIC_SITE_URL=https://nhimbe.com
NEXT_PUBLIC_API_URL=https://api.nhimbe.com

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Stytch OIDC Endpoints (Auto-configured)

These are hardcoded in the auth library:

| Endpoint | URL |
|----------|-----|
| Authorization | `https://api.stytch.com/v1/public/{project_id}/oauth2/authorize` |
| Token | `https://api.stytch.com/v1/oauth2/token` |
| UserInfo | `https://api.stytch.com/v1/oauth2/userinfo` |
| JWKS | `https://api.stytch.com/v1/sessions/jwks/{project_id}` |

Project ID: `project-live-86090362-2491-4ca7-9037-f7688c7699ce`

---

## Redirect URLs in Stytch (Already Added)

These redirect URLs have been added to the Mukoko Identity Stytch project:

**Test Environment:**
- ✅ `http://localhost:3005/api/auth/callback`
- ✅ `http://localhost:3004/api/auth/callback`

**Production:**
- ✅ `https://nhimbe.com/api/auth/callback`
