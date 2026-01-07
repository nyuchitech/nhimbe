# nhimbe.com Authentication (Stytch Connected Apps)

Sign in with Mukoko ID using **Stytch Connected Apps** (OIDC).

## How It Works

```
nhimbe.com → Stytch OAuth → Mukoko ID Login UI → Back to nhimbe.com
```

1. User clicks "Sign in with Mukoko ID" on nhimbe.com
2. Redirects to Stytch's authorization endpoint
3. Stytch shows Mukoko ID's login UI (hosted on id.mukoko.com)
4. User authenticates (email magic link, password, etc.)
5. Stytch redirects back to nhimbe.com with tokens
6. User is authenticated ✅

---

## Quick Start

### 1. Register OAuth Client in Stytch

Go to: **Stytch Dashboard → Mukoko Identity → Connected Apps**

Create a new OAuth client:
- **Client Name:** Nhimbe
- **Client Type:** Confidential
- **Redirect URIs:** 
  - `http://localhost:3005/api/auth/callback`
  - `https://nhimbe.com/api/auth/callback`
- **Scopes:** openid, profile, email

Save the **Client ID** and **Client Secret**.

### 2. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_MUKOKO_CLIENT_ID=connected-app-xxxxx
MUKOKO_CLIENT_SECRET=secret-xxxxx
NEXT_PUBLIC_MUKOKO_REDIRECT_URI=http://localhost:3005/api/auth/callback
NEXT_PUBLIC_MUKOKO_ID_URL=https://id.mukoko.com
NEXT_PUBLIC_SITE_URL=http://localhost:3005
```

### 3. Copy Files

```
nhimbe-auth-v2/
├── app/
│   ├── api/auth/
│   │   ├── callback/route.ts   # Exchanges code for tokens
│   │   ├── login/route.ts      # Initiates PKCE flow
│   │   └── logout/route.ts     # Clears session
│   └── auth/error/page.tsx     # Error display
├── components/
│   ├── auth/
│   │   ├── SignInButton.tsx    # "Sign in with Mukoko ID"
│   │   └── UserMenu.tsx        # User dropdown
│   └── Navbar.tsx              # Example navbar
└── lib/
    ├── auth-server.ts          # Server: getAuthUser()
    ├── mukoko-auth.ts          # Client: login(), logout()
    └── mukoko-auth-react.tsx   # React hooks
```

### 4. Usage

#### Server Components (Recommended)

```tsx
import { getAuthUser } from '@/lib/auth-server';
import { SignInWithMukokoButton } from '@/components/auth/SignInButton';

export default async function Page() {
  const user = await getAuthUser();

  if (!user) {
    return <SignInWithMukokoButton />;
  }

  return <p>Welcome, {user.name}!</p>;
}
```

#### Protected Routes

```tsx
import { getAuthUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getAuthUser();
  
  if (!user) {
    redirect('/api/auth/login?returnUrl=/dashboard');
  }

  return <h1>Dashboard</h1>;
}
```

---

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/auth/login?returnUrl=...` | Starts OAuth flow |
| `GET /api/auth/callback` | Handles Stytch callback |
| `GET /api/auth/logout` | Clears cookies |

---

## Authentication Flow (OIDC + PKCE)

```
1. /api/auth/login
   ├── Generate code_verifier + code_challenge (PKCE)
   ├── Store in cookies
   └── Redirect to Stytch authorization endpoint
   
2. Stytch shows Mukoko ID login UI
   └── User authenticates
   
3. Stytch redirects to /api/auth/callback?code=xxx&state=xxx
   ├── Verify state matches cookie
   ├── Exchange code for tokens (with code_verifier)
   ├── Fetch user info
   ├── Store tokens in httpOnly cookies
   └── Redirect to returnUrl
```

---

## Security

- **PKCE** prevents authorization code interception
- **httpOnly cookies** prevent XSS token theft  
- **State parameter** prevents CSRF attacks
- **Server-side token exchange** keeps client secret secure

---

## Stytch Endpoints Used

| Endpoint | URL |
|----------|-----|
| Authorization | `https://api.stytch.com/v1/public/{project_id}/oauth2/authorize` |
| Token | `https://api.stytch.com/v1/oauth2/token` |
| UserInfo | `https://api.stytch.com/v1/oauth2/userinfo` |

Project: `project-live-86090362-2491-4ca7-9037-f7688c7699ce`

---

## Redirect URLs (Already Added to Stytch)

- ✅ `http://localhost:3005/api/auth/callback`
- ✅ `http://localhost:3004/api/auth/callback`
- ✅ `https://nhimbe.com/api/auth/callback`
