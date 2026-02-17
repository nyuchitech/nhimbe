/**
<<<<<<< Updated upstream
 * Stytch Session JWT Local Validation for nhimbe Worker
 *
 * Authentication is handled entirely by the Stytch frontend SDK.
 * The backend only validates session JWTs locally using Stytch's
 * public JWKS — no Stytch API calls or secrets required.
=======
 * Stytch Authentication Helper for nhimbe Worker
 * Handles magic link session validation and user lookup
>>>>>>> Stashed changes
 */

interface StytchEnv {
  STYTCH_PROJECT_ID: string;
<<<<<<< Updated upstream
}

export interface AuthenticatedUser {
=======
  STYTCH_SECRET: string;
}

export interface StytchUser {
>>>>>>> Stashed changes
  userId: string;
}

<<<<<<< Updated upstream
// ============================================
// JWKS Cache & Fetching
// ============================================

interface JWK {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface JWKS {
  keys: JWK[];
}

let jwksCache: { keys: JWKS; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 3600_000; // 1 hour

function getJwksUrl(projectId: string): string {
  return `https://stytch.com/v1/sessions/jwks/${projectId}`;
}

async function fetchJWKS(projectId: string): Promise<JWKS> {
  const response = await fetch(getJwksUrl(projectId));
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }
  return response.json() as Promise<JWKS>;
}

async function getJWKS(projectId: string, forceRefresh = false): Promise<JWKS> {
  if (
    !forceRefresh &&
    jwksCache &&
    Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL
  ) {
    return jwksCache.keys;
  }

  const jwks = await fetchJWKS(projectId);
  jwksCache = { keys: jwks, fetchedAt: Date.now() };
  return jwks;
}

// ============================================
// JWT Parsing & Verification
// ============================================

function base64urlDecode(input: string): Uint8Array {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importRSAPublicKey(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

interface JWTHeader {
  alg: string;
  kid: string;
  typ?: string;
}

interface JWTPayload {
  sub: string;
  iss: string;
  aud: string[];
  exp: number;
  iat: number;
  nbf?: number;
}

export type JWTFailureReason =
  | "malformed_token"
  | "unsupported_algorithm"
  | "jwks_fetch_failed"
  | "key_not_found"
  | "invalid_signature"
  | "token_expired"
  | "token_not_yet_valid"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "verification_error";

export interface JWTResult {
  payload: JWTPayload | null;
  failureReason?: JWTFailureReason;
  detail?: string;
}

async function verifyJWT(
  token: string,
  projectId: string
): Promise<JWTResult> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { payload: null, failureReason: "malformed_token" };

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const header: JWTHeader = JSON.parse(
      new TextDecoder().decode(base64urlDecode(headerB64))
    );
    if (header.alg !== "RS256" || !header.kid) {
      return { payload: null, failureReason: "unsupported_algorithm", detail: `alg=${header.alg}, kid=${header.kid}` };
    }

    // Get JWKS and find matching key
    let jwks: JWKS;
    try {
      jwks = await getJWKS(projectId);
    } catch (e) {
      return { payload: null, failureReason: "jwks_fetch_failed", detail: String(e) };
    }
    let jwk = jwks.keys.find((k) => k.kid === header.kid);

    // If key not found, force refresh JWKS (handles key rotation)
    if (!jwk) {
      try {
        jwks = await getJWKS(projectId, true);
      } catch (e) {
        return { payload: null, failureReason: "jwks_fetch_failed", detail: `refresh: ${String(e)}` };
      }
      jwk = jwks.keys.find((k) => k.kid === header.kid);
      if (!jwk) {
        return { payload: null, failureReason: "key_not_found", detail: `kid=${header.kid}` };
      }
    }

    // Verify signature
    const key = await importRSAPublicKey(jwk);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlDecode(signatureB64);

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature,
      data
    );
    if (!valid) return { payload: null, failureReason: "invalid_signature" };

    // Decode and validate payload claims
    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payloadB64))
    );

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now >= payload.exp) {
      return { payload: null, failureReason: "token_expired", detail: `exp=${payload.exp}, now=${now}, expired ${now - payload.exp}s ago` };
    }
    if (payload.nbf && now < payload.nbf) {
      return { payload: null, failureReason: "token_not_yet_valid", detail: `nbf=${payload.nbf}, now=${now}` };
    }
    if (payload.iss !== `stytch.com/${projectId}`) {
      return { payload: null, failureReason: "issuer_mismatch", detail: `got="${payload.iss}", expected="stytch.com/${projectId}"` };
    }
    if (!payload.aud?.includes(projectId)) {
      return { payload: null, failureReason: "audience_mismatch", detail: `aud=${JSON.stringify(payload.aud)}, expected="${projectId}"` };
    }

    return { payload };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { payload: null, failureReason: "verification_error", detail: String(error) };
=======
interface StytchSessionUser {
  user_id: string;
  emails: Array<{ email: string; verified: boolean }>;
  name?: {
    first_name?: string;
    last_name?: string;
  };
}

interface SessionAuthenticateResponse {
  session: {
    session_id: string;
    user_id: string;
    expires_at: string;
  };
  user: StytchSessionUser;
}

const STYTCH_API_URL = 'https://api.stytch.com/v1';

function stytchAuthHeader(env: StytchEnv): string {
  return `Basic ${btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`)}`;
}

/**
 * Validate a Stytch session token by calling the sessions/authenticate endpoint
 */
export async function validateSession(
  sessionToken: string,
  env: StytchEnv
): Promise<StytchUser | null> {
  try {
    const response = await fetch(`${STYTCH_API_URL}/sessions/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: stytchAuthHeader(env),
      },
      body: JSON.stringify({
        session_token: sessionToken,
        session_duration_minutes: 60 * 24 * 30, // Extend session on validate
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as SessionAuthenticateResponse;
    const stytchUserData = data.user;

    return {
      userId: stytchUserData.user_id,
      email: stytchUserData.emails?.[0]?.email || '',
      name: {
        firstName: stytchUserData.name?.first_name,
        lastName: stytchUserData.name?.last_name,
      },
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
>>>>>>> Stashed changes
  }
}

// ============================================
// Public API
// ============================================

/**
 * Validate a Stytch session JWT locally or via API
 * For now, we validate via the sessions/authenticate endpoint using the session_token
 * In the future, consider local JWT validation using JWKS for better performance
 */
export async function validateSessionJwt(
  sessionJwt: string,
  env: StytchEnv
): Promise<StytchUser | null> {
  // JWT validation: call Stytch to validate the session JWT
  try {
    const response = await fetch(`${STYTCH_API_URL}/sessions/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: stytchAuthHeader(env),
      },
      body: JSON.stringify({
        session_jwt: sessionJwt,
        session_duration_minutes: 60 * 24 * 30,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as SessionAuthenticateResponse;
    const stytchUserData = data.user;

    return {
      userId: stytchUserData.user_id,
      email: stytchUserData.emails?.[0]?.email || '',
      name: {
        firstName: stytchUserData.name?.first_name,
        lastName: stytchUserData.name?.last_name,
      },
    };
  } catch (error) {
    console.error('Session JWT validation error:', error);
    return null;
  }
}

/**
 * Revoke a Stytch session
 */
export async function revokeSession(
  sessionToken: string,
  env: StytchEnv
): Promise<boolean> {
  try {
    const response = await fetch(`${STYTCH_API_URL}/sessions/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: stytchAuthHeader(env),
      },
      body: JSON.stringify({
        session_token: sessionToken,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Session revoke error:', error);
    return false;
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  failureReason?: JWTFailureReason | "no_token";
  detail?: string;
}

/**
<<<<<<< Updated upstream
 * Validate the Stytch session JWT locally and return the authenticated user.
 * No Stytch API calls are made — verification uses the public JWKS.
=======
 * Extract session JWT from cookies or Authorization header
 */
export function extractSessionToken(request: Request): { sessionJwt: string | null; sessionToken: string | null } {
  // Try Authorization header first (Bearer token = session JWT)
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return { sessionJwt: bearerToken, sessionToken: null };
  }

  // Try cookies
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  return {
    sessionJwt: cookies["nhimbe_session"] || null,
    sessionToken: cookies["nhimbe_session_token"] || null,
  };
}

/**
 * Middleware helper to get authenticated user from request
 * Supports both session JWT (cookie/bearer) and session token (cookie)
>>>>>>> Stashed changes
 */
export async function getAuthenticatedUser(
  request: Request,
  env: StytchEnv
<<<<<<< Updated upstream
): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) return { user: null, failureReason: "no_token" };

  const result = await verifyJWT(token, env.STYTCH_PROJECT_ID);
  if (!result.payload) {
    return { user: null, failureReason: result.failureReason, detail: result.detail };
  }

  return { user: { userId: result.payload.sub } };
=======
): Promise<StytchUser | null> {
  const { sessionJwt, sessionToken } = extractSessionToken(request);

  // Try session JWT first (from cookie or bearer token)
  if (sessionJwt) {
    const user = await validateSessionJwt(sessionJwt, env);
    if (user) return user;
  }

  // Fall back to session token
  if (sessionToken) {
    return validateSession(sessionToken, env);
  }

  return null;
>>>>>>> Stashed changes
}
