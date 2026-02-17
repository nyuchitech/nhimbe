/**
 * Referral routes — MongoDB-backed, schema.org field names.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaReferral, UserReferralCode } from "../schema.js";
import { referrals as refCol, userReferralCodes as codesCol, persons } from "../mongodb.js";
import { generateId, generateReferralCode } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET /events/:id/referrals — Leaderboard ─────────────────────────
router.get("/events/:id/referrals", async (c) => {
  const mongo = c.get("mongodb");
  const eventId = c.req.param("id");

  const leaderboard = await refCol(mongo)
    .aggregate([
      { $match: { event: eventId } },
      {
        $group: {
          _id: "$referrerUserId",
          referralCount: { $sum: 1 },
          conversionCount: {
            $sum: { $cond: [{ $in: ["$status", ["registered", "attended"]] }, 1, 0] },
          },
        },
      },
      { $sort: { conversionCount: -1 } },
      { $limit: 10 },
    ])
    .toArray();

  // Enrich with user info
  const personCol = persons(mongo);
  const enriched = await Promise.all(
    leaderboard.map(async (entry, index) => {
      const user = await personCol.findOne({ _id: entry._id as string });
      return {
        rank: index + 1,
        userId: entry._id as string,
        userName: user?.name || "Unknown",
        userInitials: user?.name
          ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
          : "??",
        referralCount: entry.referralCount,
        conversionCount: entry.conversionCount,
      };
    })
  );

  return c.json({ leaderboard: enriched });
});

// ── POST /referrals/track — Track referral ──────────────────────────
router.post("/referrals/track", async (c) => {
  const mongo = c.get("mongodb");
  const body = await c.req.json();
  const { referralCode, eventId, referredUserId } = body as {
    referralCode: string;
    eventId?: string;
    referredUserId?: string;
  };

  if (!referralCode) {
    return c.json({ error: "referralCode is required" }, 400);
  }

  // Look up referral code owner
  const codeDoc = await codesCol(mongo).findOne({ referralCode });
  if (!codeDoc) {
    return c.json({ error: "Invalid referral code" }, 404);
  }

  const referral: SchemaReferral = {
    _id: generateId(),
    referrerUserId: codeDoc.userId,
    referredUserId,
    event: eventId,
    referralCode,
    source: "link",
    status: referredUserId ? "registered" : "pending",
    dateCreated: new Date().toISOString(),
    convertedAt: referredUserId ? new Date().toISOString() : undefined,
  };

  await refCol(mongo).insertOne(referral);

  // Update referral code stats
  await codesCol(mongo).updateOne(
    { referralCode },
    {
      $inc: {
        totalReferrals: 1,
        ...(referredUserId ? { successfulReferrals: 1 } : {}),
      },
    }
  );

  return c.json({ referral }, 201);
});

// ── GET /users/:id/referral-code — Get user's referral code ─────────
router.get("/users/:id/referral-code", async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.req.param("id");

  const code = await codesCol(mongo).findOne({ userId });
  if (!code) {
    return c.json({ error: "No referral code found" }, 404);
  }

  return c.json(code);
});

// ── POST /users/:id/referral-code — Generate referral code ──────────
router.post("/users/:id/referral-code", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.req.param("id");

  // Check for existing
  const existing = await codesCol(mongo).findOne({ userId });
  if (existing) {
    return c.json(existing);
  }

  const code: UserReferralCode = {
    userId,
    referralCode: generateReferralCode(),
    totalReferrals: 0,
    successfulReferrals: 0,
    dateCreated: new Date().toISOString(),
  };

  await codesCol(mongo).insertOne(code);
  return c.json(code, 201);
});

export default router;
