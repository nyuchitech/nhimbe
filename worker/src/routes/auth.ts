import { Hono } from "hono";
import type { Env } from "../types";
import { getAuthenticatedUser } from "../auth/stytch";
import { safeParseJSON } from "../utils/validation";
import { generateId, generateHandle } from "../utils/ids";

export const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/sync
auth.post("/sync", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    console.error("Auth failed (sync):", authResult.failureReason, authResult.detail);
    return c.json({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await c.req.json() as {
    stytch_user_id: string;
    email: string;
    name: string;
  };

  if (!body.stytch_user_id || !body.email) {
    return c.json({ error: "stytch_user_id and email are required" }, 400);
  }

  interface DbUser {
    id: string;
    email: string;
    name: string | null;
    handle: string | null;
    avatar_url: string | null;
    city: string | null;
    country: string | null;
    interests: string | null;
    onboarding_completed: number | null;
    stytch_user_id: string | null;
    role: string | null;
  }

  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ? OR email = ?"
  ).bind(stytchUser.userId, body.email).first() as DbUser | null;

  if (existingUser) {
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now'), stytch_user_id = ? WHERE id = ?"
    ).bind(stytchUser.userId, existingUser.id).run();

    const user = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name || body.name,
      handle: existingUser.handle,
      avatarUrl: existingUser.avatar_url,
      city: existingUser.city,
      country: existingUser.country,
      interests: safeParseJSON(existingUser.interests, []) as string[],
      onboardingCompleted: !!(existingUser.onboarding_completed),
      stytchUserId: stytchUser.userId,
      role: existingUser.role || 'user',
    };

    return c.json({ user });
  }

  // New user — return stub, actual record created during onboarding
  const user = {
    id: null,
    email: body.email,
    name: body.name || "",
    handle: null,
    avatarUrl: null,
    city: null,
    country: null,
    interests: [],
    onboardingCompleted: false,
    stytchUserId: stytchUser.userId,
    role: 'user',
  };

  return c.json({ user });
});

// GET /api/auth/me
auth.get("/me", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    console.error("Auth failed (me):", authResult.failureReason, authResult.detail);
    return c.json({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  interface DbUserRow {
    id: string;
    email: string;
    name: string;
    handle: string | null;
    avatar_url: string | null;
    city: string | null;
    country: string | null;
    interests: string | null;
    onboarding_completed: number | null;
    stytch_user_id: string | null;
    role: string | null;
  }
  const result = await c.env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUserRow | null;

  if (!result) {
    return c.json({ error: "User not found" }, 404);
  }

  const user = {
    id: result.id,
    email: result.email,
    name: result.name,
    handle: result.handle,
    avatarUrl: result.avatar_url,
    city: result.city,
    country: result.country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: !!(result.onboarding_completed),
    stytchUserId: result.stytch_user_id,
    role: result.role || 'user',
  };

  return c.json({ user });
});

// POST /api/auth/onboarding
auth.post("/onboarding", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    console.error("Auth failed (onboarding):", authResult.failureReason, authResult.detail);
    return c.json({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await c.req.json() as {
    name: string;
    email: string;
    city: string;
    country: string;
    interests: string[];
  };

  if (!body.name || !body.email || !body.city || !body.country) {
    return c.json({ error: "Name, email, city, and country are required" }, 400);
  }

  const existingUser = await c.env.DB.prepare(
    "SELECT id FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as { id: string } | null;

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    await c.env.DB.prepare(`
      UPDATE users SET
        name = ?,
        stytch_user_id = ?,
        city = ?,
        country = ?,
        interests = ?,
        email_verified = 1,
        onboarding_completed = 1,
        last_login_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      stytchUser.userId,
      body.city,
      body.country,
      JSON.stringify(body.interests || []),
      userId
    ).run();
  } else {
    userId = generateId();
    const handle = generateHandle(body.name);

    await c.env.DB.prepare(`
      INSERT INTO users (
        id, email, name, handle, stytch_user_id,
        city, country, interests,
        email_verified, onboarding_completed, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))
    `).bind(
      userId,
      body.email,
      body.name,
      handle,
      stytchUser.userId,
      body.city,
      body.country,
      JSON.stringify(body.interests || [])
    ).run();
  }

  interface UserRow {
    id: string;
    email: string;
    name: string;
    handle: string;
    avatar_url: string | null;
    city: string;
    country: string;
    interests: string;
    stytch_user_id: string;
  }
  const result = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first() as UserRow;

  const user = {
    id: result.id,
    email: result.email,
    name: result.name,
    handle: result.handle,
    avatarUrl: result.avatar_url,
    city: result.city,
    country: result.country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: true,
    stytchUserId: result.stytch_user_id,
  };

  return c.json({ user, message: "Onboarding completed" }, 201);
});
