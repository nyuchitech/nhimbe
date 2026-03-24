import { Hono } from "hono";
import type { Env } from "../types";
import { getInitials } from "../utils/validation";
import { generateId, generateReferralCode } from "../utils/ids";

export const users = new Hono<{ Bindings: Env }>();

// GET /api/users/:id
users.get("/:id", async (c) => {
  const userId = c.req.param("id");

  const result = await c.env.DB.prepare(
    "SELECT * FROM users WHERE _id = ? OR alternate_name = ?"
  ).bind(userId, userId).first();

  if (!result) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user: result });
});

// POST /api/users
users.post("/", async (c) => {
  const body = await c.req.json() as Record<string, unknown>;
  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO users (_id, email, name, alternate_name, address_locality, address_country, interests)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.email,
    body.name,
    body.alternate_name || null,
    body.address_locality || null,
    body.address_country || null,
    JSON.stringify(body.interests || [])
  ).run();

  return c.json({ id, message: "User created successfully" }, 201);
});

// GET /api/users/:id/referral-code
users.get("/:id/referral-code", async (c) => {
  const userId = c.req.param("id");

  interface CodeRow {
    code: string;
    total_referrals: number;
    total_conversions: number;
  }

  const result = await c.env.DB.prepare(
    "SELECT code, total_referrals, total_conversions FROM user_referral_codes WHERE user_id = ?"
  ).bind(userId).first() as CodeRow | null;

  if (!result) {
    return c.json({ error: "No referral code found" }, 404);
  }

  return c.json({
    code: result.code,
    totalReferrals: result.total_referrals,
    totalConversions: result.total_conversions,
  });
});

// POST /api/users/:id/referral-code
users.post("/:id/referral-code", async (c) => {
  const userId = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT code FROM user_referral_codes WHERE user_id = ?"
  ).bind(userId).first();

  if (existing) {
    return c.json({ error: "User already has a referral code", code: (existing as { code: string }).code }, 409);
  }

  const code = generateReferralCode();

  await c.env.DB.prepare(`
    INSERT INTO user_referral_codes (id, user_id, code)
    VALUES (?, ?, ?)
  `).bind(generateId(), userId, code).run();

  return c.json({ code }, 201);
});

// GET /api/users/:id/reputation
users.get("/:id/reputation", async (c) => {
  const userId = c.req.param("id");

  interface UserRow {
    _id: string;
    name: string;
    alternate_name: string | null;
  }

  const user = await c.env.DB.prepare(
    "SELECT _id, name, alternate_name FROM users WHERE _id = ?"
  ).bind(userId).first() as UserRow | null;

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  interface StatsRow {
    events_hosted: number;
    total_attendees: number;
    avg_attendance: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as events_hosted,
      SUM(attendee_count) as total_attendees,
      AVG(attendee_count) as avg_attendance
    FROM events
    WHERE organizer_identifier = ? OR _id IN (
      SELECT event_id FROM event_hosts WHERE user_id = ?
    )
  `).bind(user.alternate_name || "", userId).first() as StatsRow | null;

  interface RatingRow {
    avg_rating: number;
    review_count: number;
  }

  const ratings = await c.env.DB.prepare(`
    SELECT
      AVG(r.rating) as avg_rating,
      COUNT(*) as review_count
    FROM event_reviews r
    JOIN events e ON r.event_id = e._id
    WHERE e.organizer_identifier = ? OR e._id IN (
      SELECT event_id FROM event_hosts WHERE user_id = ?
    )
  `).bind(user.alternate_name || "", userId).first() as RatingRow | null;

  const badges: string[] = [];
  const eventsHosted = stats?.events_hosted || 0;
  const avgRating = ratings?.avg_rating || 0;
  const reviewCount = ratings?.review_count || 0;

  if (eventsHosted >= 10 && avgRating >= 4.5) badges.push("Trusted Host");
  if (eventsHosted >= 25) badges.push("Veteran");
  if (eventsHosted >= 5 && eventsHosted < 10 && avgRating >= 4.0) badges.push("Rising Star");
  if (reviewCount >= 50 && avgRating >= 4.8) badges.push("Community Favorite");
  if ((stats?.avg_attendance || 0) >= 50) badges.push("Crowd Puller");

  const hostStats = {
    userId: user._id,
    name: user.name,
    handle: user.alternate_name || undefined,
    initials: getInitials(user.name),
    eventsHosted,
    totalAttendees: stats?.total_attendees || 0,
    avgAttendance: Math.round(stats?.avg_attendance || 0),
    rating: Math.round((avgRating || 0) * 10) / 10,
    reviewCount,
    badges,
  };

  return c.json({ host: hostStats });
});
