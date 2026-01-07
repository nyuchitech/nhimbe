/**
 * Mukoko ID Authentication Library for nhimbe.com
 * 
 * Uses Stytch Connected Apps (OIDC) for authentication
 * Mukoko ID is the identity provider via Stytch
 */

// Types
export interface MukokoUser {
  sub: string;           // Stytch user ID
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export interface MukokoTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: MukokoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Stytch Connected Apps Configuration
const config = {
  // OAuth client credentials (registered in Stytch Dashboard → Connected Apps)
  clientId: process.env.NEXT_PUBLIC_MUKOKO_CLIENT_ID!,
  redirectUri: process.env.NEXT_PUBLIC_MUKOKO_REDIRECT_URI!,
  
  // Stytch OIDC endpoints for Mukoko Identity project
  projectId: 'project-live-86090362-2491-4ca7-9037-f7688c7699ce',
  
  // OIDC endpoints
  get authorizationEndpoint() {
    return `https://api.stytch.com/v1/public/${this.projectId}/oauth2/authorize`;
  },
  get tokenEndpoint() {
    return 'https://api.stytch.com/v1/oauth2/token';
  },
  get userInfoEndpoint() {
    return 'https://api.stytch.com/v1/oauth2/userinfo';
  },
  get jwksEndpoint() {
    return `https://api.stytch.com/v1/sessions/jwks/${this.projectId}`;
  },
  
  // Mukoko ID login page (where users authenticate)
  mukokoIdUrl: process.env.NEXT_PUBLIC_MUKOKO_ID_URL || 'https://id.mukoko.com',
  
  scope: 'openid profile email',
};

// PKCE helpers
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues, (v) => charset[v % charset.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Storage keys
const STORAGE_KEYS = {
  CODE_VERIFIER: 'mukoko_code_verifier',
  STATE: 'mukoko_auth_state',
  TOKENS: 'mukoko_tokens',
  USER: 'mukoko_user',
  RETURN_URL: 'mukoko_return_url',
};

/**
 * Initialize login flow - redirects to Stytch OAuth (shows Mukoko ID login)
 */
export async function login(returnUrl?: string): Promise<void> {
  // Generate PKCE values
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  // Store for callback verification
  sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.STATE, state);
  
  if (returnUrl) {
    sessionStorage.setItem(STORAGE_KEYS.RETURN_URL, returnUrl);
  }

  // Build Stytch authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;
  
  // Redirect to Stytch (which shows Mukoko ID login UI)
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback - exchange code for tokens via Stytch
 */
export async function handleCallback(code: string, state: string): Promise<{
  user: MukokoUser;
  tokens: MukokoTokens;
  returnUrl?: string;
}> {
  // Verify state
  const savedState = sessionStorage.getItem(STORAGE_KEYS.STATE);
  if (state !== savedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }

  // Get code verifier
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!codeVerifier) {
    throw new Error('Missing code verifier - please try logging in again');
  }

  // Exchange code for tokens via Stytch token endpoint
  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json().catch(() => ({}));
    throw new Error(error.error_description || 'Failed to exchange authorization code');
  }

  const tokens: MukokoTokens = await tokenResponse.json();

  // Get user info from Stytch
  const userResponse = await fetch(config.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user info');
  }

  const user: MukokoUser = await userResponse.json();

  // Store in localStorage
  localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  // Get return URL and clean up session storage
  const returnUrl = sessionStorage.getItem(STORAGE_KEYS.RETURN_URL) || undefined;
  sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEYS.STATE);
  sessionStorage.removeItem(STORAGE_KEYS.RETURN_URL);

  return { user, tokens, returnUrl };
}

/**
 * Get current user from storage
 */
export function getCurrentUser(): MukokoUser | null {
  if (typeof window === 'undefined') return null;
  
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Get stored tokens
 */
export function getTokens(): MukokoTokens | null {
  if (typeof window === 'undefined') return null;
  
  const tokensJson = localStorage.getItem(STORAGE_KEYS.TOKENS);
  if (!tokensJson) return null;
  
  try {
    return JSON.parse(tokensJson);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const tokens = getTokens();
  const user = getCurrentUser();
  return !!(tokens && user);
}

/**
 * Logout - clear tokens and redirect to Mukoko ID logout
 */
export function logout(redirectUrl?: string): void {
  // Clear local storage
  localStorage.removeItem(STORAGE_KEYS.TOKENS);
  localStorage.removeItem(STORAGE_KEYS.USER);

  // Redirect to Mukoko ID logout
  const logoutUrl = new URL(`${config.mukokoIdUrl}/logout`);
  if (redirectUrl) {
    logoutUrl.searchParams.set('redirect_uri', redirectUrl);
  }
  
  window.location.href = logoutUrl.toString();
}

/**
 * Logout locally only (no redirect)
 */
export function logoutLocal(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKENS);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Refresh access token via Stytch
 */
export async function refreshToken(): Promise<MukokoTokens | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) return null;

  try {
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      logoutLocal();
      return null;
    }

    const newTokens: MukokoTokens = await response.json();
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(newTokens));
    
    return newTokens;
  } catch {
    logoutLocal();
    return null;
  }
}

/**
 * Make authenticated API request
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let tokens = getTokens();
  
  if (!tokens) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${tokens.access_token}`);

  let response = await fetch(url, { ...options, headers });

  // If 401, try refreshing token
  if (response.status === 401) {
    const newTokens = await refreshToken();
    if (newTokens) {
      headers.set('Authorization', `Bearer ${newTokens.access_token}`);
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

// Export config for reference
export { config as authConfig };
