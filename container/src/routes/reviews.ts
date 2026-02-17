/**
 * Review routes — MongoDB-backed, schema.org field names.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaReview, ReviewStats } from "../schema.js";
import { reviews as reviewsCol, registrations, persons, analyticsEvents } from "../mongodb.js";
import { generateId } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET /events/:id/reviews — List reviews for event ────────────────
router.get("/events/:id/reviews", async (c) => {
  const mongo = c.get("mongodb");
  const eventId = c.req.param("id");

  const col = reviewsCol(mongo);
  const reviewsList = await col
    .find({ itemReviewed: eventId })
    .sort({ datePublished: -1 })
    .toArray();

  // Enrich with author info
  const personCol = persons(mongo);
  const enriched = await Promise.all(
    reviewsList.map(async (review) => {
      const user = await personCol.findOne({ _id: review.author });
      return {
        ...review,
        authorName: user?.name || "Anonymous",
        authorInitials: user?.name
          ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
          : "??",
      };
    })
  );

  // Compute stats
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  for (const r of reviewsList) {
    const val = r.reviewRating.ratingValue;
    distribution[val] = (distribution[val] || 0) + 1;
    totalRating += val;
  }

  const stats: ReviewStats = {
    averageRating: reviewsList.length > 0 ? totalRating / reviewsList.length : 0,
    totalReviews: reviewsList.length,
    distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
  };

  return c.json({ reviews: enriched, stats });
});

// ── POST /events/:id/reviews — Submit review ────────────────────────
router.post("/events/:id/reviews", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const eventId = c.req.param("id");
  const body = await c.req.json();

  const ratingValue = body.ratingValue as number;
  if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
    return c.json({ error: "ratingValue must be between 1 and 5" }, 400);
  }

  // Check for duplicate review
  const col = reviewsCol(mongo);
  const existing = await col.findOne({ itemReviewed: eventId, author: userId });
  if (existing) {
    return c.json({ error: "You have already reviewed this event" }, 409);
  }

  // Check if verified attendee
  const reg = await registrations(mongo).findOne({
    event: eventId,
    agent: userId,
    rsvpResponse: { $in: ["registered", "approved", "attended"] },
  });

  const now = new Date().toISOString();
  const review: SchemaReview = {
    _id: generateId(),
    "@type": "Review",
    itemReviewed: eventId,
    author: userId,
    reviewRating: {
      "@type": "Rating",
      ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: body.reviewBody as string | undefined,
    datePublished: now,
    helpfulCount: 0,
    isVerifiedAttendee: !!reg,
    dateModified: now,
  };

  await col.insertOne(review);

  return c.json({ review }, 201);
});

// ── POST /reviews/:id/helpful — Vote review as helpful ──────────────
router.post("/reviews/:id/helpful", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const reviewId = c.req.param("id");

  const col = reviewsCol(mongo);
  const review = await col.findOne({ _id: reviewId });
  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  // Increment helpful count (simple approach — no duplicate vote tracking in MongoDB)
  await col.updateOne(
    { _id: reviewId },
    { $inc: { helpfulCount: 1 }, $set: { dateModified: new Date().toISOString() } }
  );

  return c.json({ success: true });
});

// ── GET /events/:id/stats — Event statistics ────────────────────────
router.get("/events/:id/stats", async (c) => {
  const mongo = c.get("mongodb");
  const eventId = c.req.param("id");

  const analyticsCol = analyticsEvents(mongo);
  const regCol = registrations(mongo);

  const [views, rsvps, checkins, referralClicks] = await Promise.all([
    analyticsCol.countDocuments({ eventId, eventType: "view" }),
    regCol.countDocuments({ event: eventId, rsvpResponse: { $nin: ["cancelled"] } }),
    regCol.countDocuments({ event: eventId, rsvpResponse: "attended" }),
    analyticsCol.countDocuments({ eventId, eventType: "referral_click" }),
  ]);

  // Top sources
  const sources = await analyticsCol
    .aggregate([
      { $match: { eventId, eventType: "view", source: { $ne: null } } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  // Top cities
  const cities = await analyticsCol
    .aggregate([
      { $match: { eventId, eventType: "view", city: { $ne: null } } },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  return c.json({
    views,
    rsvps,
    checkins,
    referralClicks,
    topSources: sources.map((s) => ({ source: s._id, count: s.count })),
    topCities: cities.map((ci) => ({ city: ci._id, count: ci.count })),
  });
});

export default router;
