/**
 * User routes — MongoDB-backed, schema.org field names.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaPerson } from "../schema.js";
import { persons, hostStats as hostStatsCol, reviews as reviewsCol, events as eventsCol } from "../mongodb.js";
import { generateId, getInitials, generateHandle } from "../utils.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET /:id — Get user by ID or handle ─────────────────────────────
router.get("/:id", async (c) => {
  const mongo = c.get("mongodb");
  const id = c.req.param("id");

  const col = persons(mongo);
  const user = await col.findOne({
    $or: [
      { _id: id },
      { alternateName: id },
      { alternateName: `@${id}` },
    ],
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});

// ── POST / — Create user ────────────────────────────────────────────
router.post("/", async (c) => {
  const mongo = c.get("mongodb");
  const body = await c.req.json();
  const { email, name, city, country, interests, stytchUserId, mukokoOrgMemberId } = body as {
    email: string;
    name: string;
    city?: string;
    country?: string;
    interests?: string[];
    stytchUserId?: string;
    mukokoOrgMemberId?: string;
  };

  if (!email || !name) {
    return c.json({ error: "email and name are required" }, 400);
  }

  const col = persons(mongo);

  // Check for existing
  const existing = await col.findOne({ email });
  if (existing) {
    return c.json({ error: "User with this email already exists" }, 409);
  }

  const now = new Date().toISOString();
  const user: SchemaPerson = {
    _id: generateId(),
    "@type": "Person",
    email,
    name,
    alternateName: generateHandle(name),
    image: undefined,
    description: undefined,
    address: (city || country)
      ? {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: country,
        }
      : undefined,
    interests: interests || [],
    eventsAttended: 0,
    eventsHosted: 0,
    role: "user",
    stytchUserId,
    mukokoOrgMemberId,
    emailVerified: true,
    onboardingCompleted: false,
    dateCreated: now,
    dateModified: now,
  };

  await col.insertOne(user);
  return c.json({ user }, 201);
});

// ── GET /:id/reputation — Host reputation ───────────────────────────
router.get("/:id/reputation", async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.req.param("id");

  const user = await persons(mongo).findOne({ _id: userId });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Get host stats from aggregation
  const hostedEvents = await eventsCol(mongo)
    .find({ "organizer.identifier": userId })
    .toArray();

  const totalAttendees = hostedEvents.reduce((sum, e) => sum + e.attendeeCount, 0);
  const totalCapacity = hostedEvents.reduce((sum, e) => sum + (e.maximumAttendeeCapacity || 0), 0);

  // Get reviews for hosted events
  const eventIds = hostedEvents.map((e) => e._id);
  const allReviews = await reviewsCol(mongo)
    .find({ itemReviewed: { $in: eventIds } })
    .toArray();

  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.reviewRating.ratingValue, 0) / allReviews.length
      : 0;

  // Compute badges
  const badges: string[] = [];
  if (user.eventsHosted >= 5) badges.push("Veteran");
  if (user.eventsHosted >= 1 && user.eventsHosted < 5) badges.push("Rising Star");
  if (avgRating >= 4.5 && allReviews.length >= 3) badges.push("Community Favorite");
  if (totalAttendees >= 50) badges.push("Crowd Puller");
  if (user.eventsHosted >= 3 && avgRating >= 4.0) badges.push("Trusted Host");

  return c.json({
    userId: user._id,
    name: user.name,
    alternateName: user.alternateName,
    initials: getInitials(user.name),
    eventsHosted: user.eventsHosted,
    totalAttendees,
    avgAttendance: totalCapacity > 0 ? totalAttendees / totalCapacity : 0,
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: allReviews.length,
    badges,
  });
});

export default router;
