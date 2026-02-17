/**
 * Auth routes — MongoDB-backed, schema.org field names.
 * Handles session validation, onboarding, and token exchange.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaPerson } from "../schema.js";
import { persons } from "../mongodb.js";
import { generateId, getInitials, generateHandle } from "../utils.js";
import { extractSessionToken, validateStytchSession } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET /me — Get authenticated user ────────────────────────────────
router.get("/me", async (c) => {
  const sessionToken = extractSessionToken(c);
  if (!sessionToken) {
    return c.json({ error: "Not authenticated" }, 401);
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

  return c.json({ user });
});

// ── POST /onboarding — Complete onboarding ──────────────────────────
router.post("/onboarding", async (c) => {
  const sessionToken = extractSessionToken(c);
  if (!sessionToken) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const stytchUser = await validateStytchSession(sessionToken);
  if (!stytchUser) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  const body = await c.req.json();
  const { name, city, country, interests } = body as {
    name?: string;
    city?: string;
    country?: string;
    interests?: string[];
  };

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  const mongo = c.get("mongodb");
  const col = persons(mongo);

  // Find existing user
  let user = await col.findOne({
    $or: [
      { stytchUserId: stytchUser.userId },
      { mukokoOrgMemberId: stytchUser.userId },
      { email: stytchUser.email },
    ],
  });

  const now = new Date().toISOString();

  if (user) {
    // Update existing
    await col.updateOne(
      { _id: user._id },
      {
        $set: {
          name,
          onboardingCompleted: true,
          ...(city && { "address.@type": "PostalAddress", "address.addressLocality": city }),
          ...(country && { "address.addressCountry": country }),
          ...(interests && { interests }),
          dateModified: now,
        },
      }
    );
    user = await col.findOne({ _id: user._id });
  } else {
    // Create new user
    const newUser: SchemaPerson = {
      _id: generateId(),
      "@type": "Person",
      email: stytchUser.email,
      name,
      alternateName: generateHandle(name),
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: country,
      },
      interests: interests || [],
      eventsAttended: 0,
      eventsHosted: 0,
      role: "user",
      stytchUserId: stytchUser.userId,
      emailVerified: true,
      onboardingCompleted: true,
      lastLoginAt: now,
      dateCreated: now,
      dateModified: now,
    };
    await col.insertOne(newUser);
    user = newUser;
  }

  return c.json({ user });
});

// ── POST /token — Exchange Stytch credentials for user data ─────────
router.post("/token", async (c) => {
  const body = await c.req.json();
  const {
    stytch_user_id,
    email,
    name,
    mukoko_org_member_id,
    auth_provider,
  } = body as {
    stytch_user_id?: string;
    email?: string;
    name?: string;
    mukoko_org_member_id?: string;
    auth_provider?: "email" | "mukoko_id";
  };

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  const mongo = c.get("mongodb");
  const col = persons(mongo);
  const now = new Date().toISOString();

  // Look up existing user by email or auth provider IDs
  let user = await col.findOne({
    $or: [
      ...(stytch_user_id ? [{ stytchUserId: stytch_user_id }] : []),
      ...(mukoko_org_member_id ? [{ mukokoOrgMemberId: mukoko_org_member_id }] : []),
      { email },
    ],
  });

  if (user) {
    // Update last login and link auth providers
    const updates: Record<string, unknown> = {
      lastLoginAt: now,
      dateModified: now,
    };
    if (stytch_user_id && !user.stytchUserId) updates.stytchUserId = stytch_user_id;
    if (mukoko_org_member_id && !user.mukokoOrgMemberId) updates.mukokoOrgMemberId = mukoko_org_member_id;
    if (auth_provider) updates.authProvider = auth_provider;

    await col.updateOne({ _id: user._id }, { $set: updates });
    user = await col.findOne({ _id: user._id });
  } else {
    // Create new user
    const newUser: SchemaPerson = {
      _id: generateId(),
      "@type": "Person",
      email,
      name: name || email.split("@")[0],
      alternateName: generateHandle(name || email.split("@")[0]),
      eventsAttended: 0,
      eventsHosted: 0,
      role: "user",
      stytchUserId: stytch_user_id,
      mukokoOrgMemberId: mukoko_org_member_id,
      authProvider: auth_provider || "email",
      emailVerified: true,
      onboardingCompleted: false,
      lastLoginAt: now,
      dateCreated: now,
      dateModified: now,
    };
    await col.insertOne(newUser);
    user = newUser;
  }

  return c.json({ user });
});

export default router;
