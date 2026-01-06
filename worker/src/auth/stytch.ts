/**
 * Stytch OAuth Authentication Helper for nhimbe Worker
 * Handles OAuth Connected App token exchange and validation
 */

interface StytchEnv {
  STYTCH_PROJECT_ID: string;
  STYTCH_SECRET: string;
  STYTCH_CLIENT_ID: string;
  STYTCH_CLIENT_SECRET: string;
}

interface StytchUser {
  userId: string;
  email: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface UserInfoResponse {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

const STYTCH_TOKEN_URL = "https://api.stytch.com/v1/oauth2/token";
const STYTCH_USERINFO_URL = "https://api.stytch.com/v1/oauth2/userinfo";

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  env: StytchEnv
): Promise<TokenResponse | null> {
  try {
    const response = await fetch(STYTCH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${env.STYTCH_CLIENT_ID}:${env.STYTCH_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Token exchange failed:", error);
      return null;
    }

    return await response.json() as TokenResponse;
  } catch (error) {
    console.error("Token exchange error:", error);
    return null;
  }
}

/**
 * Get user info using access token
 */
export async function getUserInfo(
  accessToken: string
): Promise<UserInfoResponse | null> {
  try {
    const response = await fetch(STYTCH_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("UserInfo failed:", error);
      return null;
    }

    return await response.json() as UserInfoResponse;
  } catch (error) {
    console.error("UserInfo error:", error);
    return null;
  }
}

/**
 * Validate access token by fetching user info
 */
export async function validateAccessToken(
  accessToken: string
): Promise<StytchUser | null> {
  const userInfo = await getUserInfo(accessToken);
  if (!userInfo) {
    return null;
  }

  return {
    userId: userInfo.sub,
    email: userInfo.email || "",
    name: {
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  env: StytchEnv
): Promise<TokenResponse | null> {
  try {
    const response = await fetch(STYTCH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${env.STYTCH_CLIENT_ID}:${env.STYTCH_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Token refresh failed:", error);
      return null;
    }

    return await response.json() as TokenResponse;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
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

/**
 * Middleware helper to get authenticated user from request
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getAuthenticatedUser(
  request: Request,
  _env: StytchEnv
): Promise<StytchUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  return validateAccessToken(token);
}
