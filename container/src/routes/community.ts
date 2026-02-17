/**
 * Community stats routes — MongoDB-backed.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import { events as eventsCol, persons, registrations } from "../mongodb.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET /stats — Community statistics ───────────────────────────────
router.get("/stats", async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const city = url.searchParams.get("city");

  const eventFilter: Record<string, unknown> = { isPublished: true };
  if (city) eventFilter["location.address.addressLocality"] = city;

  const col = eventsCol(mongo);

  const [totalEvents, totalAttendees, activeHosts] = await Promise.all([
    col.countDocuments(eventFilter),
    col.aggregate([
      { $match: eventFilter },
      { $group: { _id: null, total: { $sum: "$attendeeCount" } } },
    ]).toArray().then((r) => r[0]?.total || 0),
    col.aggregate([
      { $match: eventFilter },
      { $group: { _id: "$organizer.identifier" } },
      { $count: "count" },
    ]).toArray().then((r) => r[0]?.count || 0),
  ]);

  // Trending categories
  const trendingCategories = await col
    .aggregate([
      { $match: { ...eventFilter, eventStatus: "EventScheduled" } },
      { $group: { _id: "$category", count: { $sum: 1 }, attendees: { $sum: "$attendeeCount" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  // Popular venues
  const popularVenues = await col
    .aggregate([
      { $match: { ...eventFilter, "location.@type": "Place" } },
      { $group: { _id: "$location.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  return c.json({
    totalEvents,
    totalAttendees,
    activeHosts,
    trendingCategories: trendingCategories.map((cat) => ({
      category: cat._id,
      count: cat.count,
      attendees: cat.attendees,
    })),
    popularVenues: popularVenues.map((v) => ({
      venue: v._id,
      count: v.count,
    })),
  });
});

export default router;
