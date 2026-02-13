/**
 * Stytch Consumer SDK Authentication Helper for nhimbe Worker
 * Validates Stytch session JWTs via the sessions/authenticate API
 */

interface StytchEnv {
  STYTCH_PROJECT_ID: string;
  STYTCH_SECRET: string;
}

interface StytchUser {
  userId: string;
  email: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

const STYTCH_SESSIONS_URL = "https://api.stytch.com/v1/sessions/authenticate";
const STYTCH_REVOKE_URL = "https://api.stytch.com/v1/sessions/revoke";

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
 * Validate a Stytch session JWT by calling the sessions/authenticate endpoint
 */
async function validateSessionJwt(
  sessionJwt: string,
  env: StytchEnv
): Promise<StytchUser | null> {
  try {
    const response = await fetch(STYTCH_SESSIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`)}`,
      },
      body: JSON.stringify({
        session_jwt: sessionJwt,
        session_duration_minutes: 10080,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Session validation failed:", error);
      return null;
    }

    const data = await response.json() as {
      user: {
        user_id: string;
        emails: Array<{ email: string }>;
        name?: {
          first_name?: string;
          last_name?: string;
        };
      };
    };

    return {
      userId: data.user.user_id,
      email: data.user.emails?.[0]?.email || "",
      name: {
        firstName: data.user.name?.first_name,
        lastName: data.user.name?.last_name,
      },
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

/**
 * Middleware helper to get authenticated user from request
 */
export async function getAuthenticatedUser(
  request: Request,
  env: StytchEnv
): Promise<StytchUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  return validateSessionJwt(token, env);
}

/**
 * Revoke a Stytch session
 */
export async function revokeSession(
  sessionJwt: string,
  env: StytchEnv
): Promise<boolean> {
  try {
    const response = await fetch(STYTCH_REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${env.STYTCH_PROJECT_ID}:${env.STYTCH_SECRET}`)}`,
      },
      body: JSON.stringify({
        session_jwt: sessionJwt,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Session revocation error:", error);
    return false;
  }
}
