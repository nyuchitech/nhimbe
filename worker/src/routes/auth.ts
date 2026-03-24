import { Hono } from "hono";
import type { Env } from "../types";
import { getAuthenticatedUser } from "../auth/stytch";
import { safeParseJSON } from "../utils/validation";
import { generateId } from "../utils/ids";

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
    _id: string;
    email: string;
    name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
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
      "UPDATE users SET last_login_at = datetime('now'), stytch_user_id = ?, date_modified = datetime('now') WHERE _id = ?"
    ).bind(stytchUser.userId, existingUser._id).run();

    const user = {
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.name || body.name,
      avatarUrl: existingUser.image,
      city: existingUser.address_locality,
      country: existingUser.address_country,
      interests: safeParseJSON(existingUser.interests, []) as string[],
      onboardingCompleted: !!(existingUser.onboarding_completed),
      stytchUserId: stytchUser.userId,
      role: existingUser.role || 'user',
    };

    return c.json({ user });
  }

  // New user — create record immediately so profile updates can find them
  const newId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO users (_id, email, name, stytch_user_id, last_login_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(newId, body.email, body.name || "", stytchUser.userId).run();

  const user = {
    id: newId,
    email: body.email,
    name: body.name || "",
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
    _id: string;
    email: string;
    name: string;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
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
    id: result._id,
    email: result.email,
    name: result.name,
    avatarUrl: result.image,
    city: result.address_locality,
    country: result.address_country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: !!(result.onboarding_completed),
    stytchUserId: result.stytch_user_id,
    role: result.role || 'user',
  };

  return c.json({ user });
});

// PATCH /api/auth/profile — progressive profile updates (UPSERT)
auth.patch("/profile", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    console.error("Auth failed (profile):", authResult.failureReason, authResult.detail);
    return c.json({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await c.req.json() as {
    name?: string;
    email?: string;
    city?: string;
    country?: string;
    interests?: string[];
  };

  // At least one field must be provided
  if (!body.name && !body.city && !body.country && !body.interests) {
    return c.json({ error: "At least one field is required" }, 400);
  }

  interface DbUser {
    _id: string;
    email: string;
    name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    interests: string | null;
    stytch_user_id: string | null;
    role: string | null;
    onboarding_completed: number | null;
  }

  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUser | null;

  if (!existingUser) {
    return c.json({ error: "User not found. Please sign out and sign in again." }, 404);
  }

  const userId = existingUser._id;
  const setClauses: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) { setClauses.push("name = ?"); values.push(body.name); }
  if (body.city !== undefined) { setClauses.push("address_locality = ?"); values.push(body.city); }
  if (body.country !== undefined) { setClauses.push("address_country = ?"); values.push(body.country); }
  if (body.interests !== undefined) { setClauses.push("interests = ?"); values.push(JSON.stringify(body.interests)); }
  setClauses.push("date_modified = datetime('now')");

  await c.env.DB.prepare(
    `UPDATE users SET ${setClauses.join(", ")} WHERE _id = ?`
  ).bind(...values, userId).run();

  const result = await c.env.DB.prepare(
    "SELECT * FROM users WHERE _id = ?"
  ).bind(userId).first() as DbUser;

  const user = {
    id: result._id,
    email: result.email,
    name: result.name,
    avatarUrl: result.image,
    city: result.address_locality,
    country: result.address_country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: !!(result.onboarding_completed),
    stytchUserId: result.stytch_user_id,
    role: result.role || "user",
  };

  return c.json({ user });
});
