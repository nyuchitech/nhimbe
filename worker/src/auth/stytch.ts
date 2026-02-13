/**
 * Stytch Session JWT Local Validation for nhimbe Worker
 *
 * Authentication is handled entirely by the Stytch frontend SDK.
 * The backend only validates session JWTs locally using Stytch's
 * public JWKS — no Stytch API calls or secrets required.
 */

interface StytchEnv {
  STYTCH_PROJECT_ID: string;
}

export interface AuthenticatedUser {
  userId: string;
}

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

async function verifyJWT(
  token: string,
  projectId: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const header: JWTHeader = JSON.parse(
      new TextDecoder().decode(base64urlDecode(headerB64))
    );
    if (header.alg !== "RS256" || !header.kid) return null;

    // Get JWKS and find matching key
    let jwks = await getJWKS(projectId);
    let jwk = jwks.keys.find((k) => k.kid === header.kid);

    // If key not found, force refresh JWKS (handles key rotation)
    if (!jwk) {
      jwks = await getJWKS(projectId, true);
      jwk = jwks.keys.find((k) => k.kid === header.kid);
      if (!jwk) return null;
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
    if (!valid) return null;

    // Decode and validate payload claims
    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(payloadB64))
    );

    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now >= payload.exp) return null;
    if (payload.nbf && now < payload.nbf) return null;
    if (payload.iss !== `stytch.com/${projectId}`) return null;
    if (!payload.aud?.includes(projectId)) return null;

    return payload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

// ============================================
// Public API
// ============================================

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

/**
 * Validate the Stytch session JWT locally and return the authenticated user.
 * No Stytch API calls are made — verification uses the public JWKS.
 */
export async function getAuthenticatedUser(
  request: Request,
  env: StytchEnv
): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const payload = await verifyJWT(token, env.STYTCH_PROJECT_ID);
  if (!payload) return null;

  return { userId: payload.sub };
}
