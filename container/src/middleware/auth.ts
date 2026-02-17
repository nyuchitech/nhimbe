/**
 * Authentication middleware — supports both Stytch B2C (magic links) and B2B (Mukoko ID).
 */

import type { Context, Next } from "hono";
import type { AppVariables } from "../types.js";
import type { UserRole } from "../schema.js";
import { hasPermission } from "../schema.js";
import { persons } from "../mongodb.js";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://nhimbe.com",
  "https://www.nhimbe.com",
];

/**
 * Extract session token from cookie or Authorization header.
 */
export function extractSessionToken(c: Context<{ Variables: AppVariables }>): string | null {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = c.req.header("Cookie") || "";
  const sessionMatch = cookies.match(/nhimbe_session=([^;]+)/);
  if (sessionMatch) return sessionMatch[1];

  const tokenMatch = cookies.match(/nhimbe_session_token=([^;]+)/);
  if (tokenMatch) return tokenMatch[1];

  return null;
}

interface StytchUser {
  userId: string;
  email: string;
}

/**
 * Validate a Stytch session (tries B2C first, then B2B).
 */
export async function validateStytchSession(sessionToken: string): Promise<StytchUser | null> {
  const b2cResult = await tryB2CSession(sessionToken);
  if (b2cResult) return b2cResult;

  const b2bResult = await tryB2BSession(sessionToken);
  if (b2bResult) return b2bResult;

  return null;
}

async function tryB2CSession(sessionToken: string): Promise<StytchUser | null> {
  const projectId = process.env.STYTCH_PROJECT_ID;
  const secret = process.env.STYTCH_SECRET;
  if (!projectId || !secret) return null;

  try {
    const response = await fetch("https://api.stytch.com/v1/sessions/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${projectId}:${secret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        session_token: sessionToken,
        session_duration_minutes: 60 * 24 * 30,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      user?: { user_id: string; emails: Array<{ email: string }> };
    };
    const user = data.user;
    if (!user) return null;

    return {
      userId: user.user_id,
      email: user.emails?.[0]?.email || "",
    };
  } catch {
    return null;
  }
}

async function tryB2BSession(sessionToken: string): Promise<StytchUser | null> {
  const projectId = process.env.STYTCH_B2B_PROJECT_ID;
  const secret = process.env.STYTCH_B2B_SECRET;
  if (!projectId || !secret) return null;

  try {
    const response = await fetch("https://api.stytch.com/v1/b2b/sessions/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${projectId}:${secret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        session_token: sessionToken,
        session_duration_minutes: 60 * 24 * 30,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      member?: { member_id: string; email_address: string };
    };
    const member = data.member;
    if (!member) return null;

    return {
      userId: member.member_id,
      email: member.email_address,
    };
  } catch {
    return null;
  }
}

/**
 * Require authenticated user. Sets userId, userEmail, userRole on context.
 */
export function requireAuth() {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const sessionToken = extractSessionToken(c);
    if (!sessionToken) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const stytchUser = await validateStytchSession(sessionToken);
    if (!stytchUser) {
      return c.json({ error: "Invalid or expired session" }, 401);
    }

    const mongo = c.get("mongodb");
    const user = await persons(mongo).findOne({
      $or: [
        { stytchUserId: stytchUser.userId },
        { mukokoOrgMemberId: stytchUser.userId },
        { email: stytchUser.email },
      ],
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    c.set("userId", user._id);
    c.set("userEmail", user.email);
    c.set("userRole", user.role);
    await next();
  };
}

/**
 * Require minimum role level.
 */
export function requireRole(minimumRole: UserRole) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const userRole = c.get("userRole") as UserRole | undefined;
    if (!userRole || !hasPermission(userRole, minimumRole)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  };
}

/**
 * Require valid API key or allowed origin.
 */
export function requireApiKeyOrOrigin() {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const apiKey = c.req.header("X-API-Key");
    const expectedKey = process.env.API_KEY;
    if (apiKey && expectedKey && apiKey === expectedKey) {
      await next();
      return;
    }

    const origin = c.req.header("Origin") || "";
    const extraOrigin = process.env.ALLOWED_ORIGIN;
    const allOrigins = extraOrigin ? [...ALLOWED_ORIGINS, extraOrigin] : ALLOWED_ORIGINS;
    if (allOrigins.includes(origin)) {
      await next();
      return;
    }

    return c.json({ error: "Unauthorized" }, 401);
  };
}
