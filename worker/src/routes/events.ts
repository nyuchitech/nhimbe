import { Hono } from "hono";
import type { Env, Event } from "../types";
import { safeParseInt } from "../utils/validation";
import { slugify } from "../utils/validation";
import { generateId, generateShortCode } from "../utils/ids";
import { dbRowToEvent } from "../utils/db";
import { writeAuth } from "../middleware/auth";
import { indexEvent, removeEventFromIndex } from "../ai/embeddings";

export const events = new Hono<{ Bindings: Env }>();

// Write operations require API key or allowed origin
events.use("*", writeAuth);

// GET /api/events
events.get("/", async (c) => {
  const city = c.req.query("city");
  const category = c.req.query("category");
  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);

  let query = "SELECT * FROM events WHERE is_published = TRUE AND is_cancelled = FALSE";
  const params: unknown[] = [];

  if (city) {
    query += " AND location_city = ?";
    params.push(city);
  }
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY date_iso ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const eventsList = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));

  return c.json({
    events: eventsList,
    pagination: { limit, offset, total: eventsList.length },
  });
});

// GET /api/events/trending (MUST be before /:id)
events.get("/trending", async (c) => {
  const city = c.req.query("city");
  const limit = safeParseInt(c.req.query("limit") || null, 10, 1, 50);

  let query = `
    SELECT e.*,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e.id) as views,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e.id AND created_at >= datetime('now', '-7 days')) as recent_views
    FROM events e
    WHERE e.is_published = TRUE AND e.is_cancelled = FALSE
    AND e.date_iso >= datetime('now')
  `;
  const params: (string | number)[] = [];

  if (city) {
    query += " AND e.location_city = ?";
    params.push(city);
  }

  query += " ORDER BY recent_views DESC, views DESC LIMIT ?";
  params.push(limit);

  const result = await c.env.DB.prepare(query).bind(...params).all();

  interface EventRow extends Record<string, unknown> {
    views: number;
    recent_views: number;
  }

  const eventsList = (result.results as EventRow[]).map((row) => {
    const event = dbRowToEvent(row);
    return {
      ...event,
      views: row.views,
      trend: row.views > 10 ? Math.round((row.recent_views / row.views) * 100) : 0,
      isHot: row.recent_views > 20,
    };
  });

  return c.json({ events: eventsList });
});

// GET /api/events/:id
events.get("/:id", async (c) => {
  const eventId = c.req.param("id");

  const result = await c.env.DB.prepare("SELECT * FROM events WHERE id = ? OR slug = ? OR short_code = ?")
    .bind(eventId, eventId, eventId)
    .first();

  if (!result) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json({ event: dbRowToEvent(result as Record<string, unknown>) });
});

// POST /api/events
events.post("/", async (c) => {
  const body = await c.req.json() as Partial<Event>;

  const id = body.id || generateId();
  const shortCode = body.shortCode || generateShortCode();
  const slug = body.slug || slugify(body.title || "");

  await c.env.DB.prepare(`
    INSERT INTO events (
      id, short_code, slug, title, description,
      date_day, date_month, date_full, date_time, date_iso,
      location_venue, location_address, location_city, location_country,
      category, tags, cover_image, cover_gradient,
      attendee_count, capacity, is_online, meeting_url, meeting_platform,
      host_name, host_handle, host_initials, host_event_count,
      is_free, ticket_url,
      price_amount, price_currency, price_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    shortCode,
    slug,
    body.title,
    body.description,
    body.date?.day,
    body.date?.month,
    body.date?.full,
    body.date?.time,
    body.date?.iso,
    body.location?.venue,
    body.location?.address,
    body.location?.city,
    body.location?.country,
    body.category,
    JSON.stringify(body.tags || []),
    body.coverImage,
    body.coverGradient,
    body.attendeeCount || 0,
    body.capacity,
    body.isOnline || false,
    body.meetingUrl,
    body.meetingPlatform,
    body.host?.name,
    body.host?.handle,
    body.host?.initials,
    body.host?.eventCount || 0,
    body.isFree !== false,
    body.ticketUrl || null,
    body.price?.amount,
    body.price?.currency,
    body.price?.label
  ).run();

  const event: Event = {
    id,
    shortCode,
    slug,
    title: body.title || "",
    description: body.description || "",
    date: body.date!,
    location: body.location!,
    category: body.category || "",
    tags: body.tags || [],
    coverImage: body.coverImage,
    coverGradient: body.coverGradient,
    attendeeCount: body.attendeeCount || 0,
    capacity: body.capacity,
    isOnline: body.isOnline,
    meetingUrl: body.meetingUrl,
    meetingPlatform: body.meetingPlatform,
    host: body.host!,
    isFree: body.isFree !== false,
    ticketUrl: body.ticketUrl,
    price: body.price,
  };

  await indexEvent(c.env.AI, c.env.VECTORIZE, event);

  return c.json({ event, message: "Event created successfully" }, 201);
});

// PUT /api/events/:id
events.put("/:id", async (c) => {
  const eventId = c.req.param("id");
  const body = await c.req.json() as Partial<Event>;

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.title) { updates.push("title = ?"); params.push(body.title); }
  if (body.description) { updates.push("description = ?"); params.push(body.description); }
  if (body.category) { updates.push("category = ?"); params.push(body.category); }
  if (body.tags) { updates.push("tags = ?"); params.push(JSON.stringify(body.tags)); }

  updates.push("updated_at = datetime('now')");
  params.push(eventId);

  await c.env.DB.prepare(
    `UPDATE events SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...params).run();

  const result = await c.env.DB.prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first();

  if (result) {
    await indexEvent(c.env.AI, c.env.VECTORIZE, dbRowToEvent(result as Record<string, unknown>));
  }

  return c.json({ message: "Event updated successfully" });
});

// DELETE /api/events/:id
events.delete("/:id", async (c) => {
  const eventId = c.req.param("id");

  await c.env.DB.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
  await removeEventFromIndex(c.env.VECTORIZE, eventId);

  return c.json({ message: "Event deleted successfully" });
});

// POST /api/events/:id/view
events.post("/:id/view", async (c) => {
  const eventId = c.req.param("id");
  try {
    const body = await c.req.json() as { user_id?: string; source?: string };

    await c.env.DB.prepare(
      "INSERT INTO event_views (event_id, user_id, source) VALUES (?, ?, ?)"
    ).bind(eventId, body.user_id || null, body.source || "web").run();

    return c.json({ message: "View tracked" });
  } catch (error) {
    console.error("Failed to track view:", error);
    return c.json({ message: "View tracking failed" }, 500);
  }
});

// GET /api/events/:id/reviews
events.get("/:id/reviews", async (c) => {
  const eventId = c.req.param("id");

  interface ReviewRow {
    id: string;
    event_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    helpful_count: number;
    is_verified_attendee: number;
    created_at: string;
    user_name: string | null;
  }

  const reviewsResult = await c.env.DB.prepare(`
    SELECT r.*, u.name as user_name
    FROM event_reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ?
    ORDER BY r.helpful_count DESC, r.created_at DESC
    LIMIT 50
  `).bind(eventId).all();

  const { getInitials } = await import("../utils/validation");

  const reviews = (reviewsResult.results as ReviewRow[]).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    userName: row.user_name || "Anonymous",
    userInitials: getInitials(row.user_name || "Anonymous"),
    rating: row.rating,
    comment: row.comment || undefined,
    helpfulCount: row.helpful_count,
    isVerifiedAttendee: !!row.is_verified_attendee,
    createdAt: row.created_at,
  }));

  interface StatsRow {
    avg_rating: number;
    total_reviews: number;
    rating_1: number;
    rating_2: number;
    rating_3: number;
    rating_4: number;
    rating_5: number;
  }

  const statsResult = await c.env.DB.prepare(`
    SELECT
      AVG(rating) as avg_rating,
      COUNT(*) as total_reviews,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
    FROM event_reviews
    WHERE event_id = ?
  `).bind(eventId).first() as StatsRow | null;

  const stats = {
    averageRating: statsResult?.avg_rating || 0,
    totalReviews: statsResult?.total_reviews || 0,
    distribution: {
      1: statsResult?.rating_1 || 0,
      2: statsResult?.rating_2 || 0,
      3: statsResult?.rating_3 || 0,
      4: statsResult?.rating_4 || 0,
      5: statsResult?.rating_5 || 0,
    },
  };

  return c.json({ reviews, stats });
});

// POST /api/events/:id/reviews
events.post("/:id/reviews", async (c) => {
  const eventId = c.req.param("id");
  const body = await c.req.json() as {
    userId: string;
    rating: number;
    comment?: string;
  };

  if (!body.userId || !body.rating || body.rating < 1 || body.rating > 5) {
    return c.json({ error: "userId and rating (1-5) required" }, 400);
  }

  const registration = await c.env.DB.prepare(
    "SELECT id FROM registrations WHERE event_id = ? AND user_id = ? AND status IN ('registered', 'approved', 'checked_in')"
  ).bind(eventId, body.userId).first();

  const id = generateId();

  try {
    await c.env.DB.prepare(`
      INSERT INTO event_reviews (id, event_id, user_id, rating, comment, is_verified_attendee)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      eventId,
      body.userId,
      body.rating,
      body.comment || null,
      registration ? 1 : 0
    ).run();

    if (c.env.ANALYTICS_QUEUE) {
      await c.env.ANALYTICS_QUEUE.send({
        type: "review",
        eventId,
        userId: body.userId,
        data: { rating: body.rating },
        timestamp: new Date().toISOString(),
      });
    }

    return c.json({ id, message: "Review submitted successfully" }, 201);
  } catch {
    return c.json({ error: "You have already reviewed this event" }, 409);
  }
});

// GET /api/events/:id/stats
events.get("/:id/stats", async (c) => {
  const eventId = c.req.param("id");

  interface StatsRow {
    views: number;
    unique_views: number;
    rsvps: number;
    checkins: number;
    referrals: number;
    views_7_days_ago: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM event_views WHERE event_id = ?) as views,
      (SELECT COUNT(DISTINCT COALESCE(user_id, source || ip_hash)) FROM event_views WHERE event_id = ?) as unique_views,
      (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND status != 'cancelled') as rsvps,
      (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND checked_in_at IS NOT NULL) as checkins,
      (SELECT COUNT(*) FROM referrals WHERE event_id = ? AND status = 'converted') as referrals,
      (SELECT COUNT(*) FROM event_views WHERE event_id = ? AND created_at < datetime('now', '-7 days')) as views_7_days_ago
  `).bind(eventId, eventId, eventId, eventId, eventId, eventId).first() as StatsRow | null;

  const currentViews = stats?.views || 0;
  const lastWeekViews = stats?.views_7_days_ago || 0;
  const recentViews = currentViews - lastWeekViews;
  const trend = lastWeekViews > 0 ? Math.round(((recentViews - lastWeekViews) / lastWeekViews) * 100) : 0;
  const isHot = trend > 50 || (currentViews > 100 && trend > 20);

  interface SourceRow {
    source: string;
    count: number;
  }
  const sourcesResult = await c.env.DB.prepare(`
    SELECT source, COUNT(*) as count
    FROM event_views
    WHERE event_id = ?
    GROUP BY source
    ORDER BY count DESC
    LIMIT 5
  `).bind(eventId).all();

  interface CityRow {
    city: string;
    count: number;
  }
  const citiesResult = await c.env.DB.prepare(`
    SELECT u.city, COUNT(*) as count
    FROM registrations r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ? AND u.city IS NOT NULL
    GROUP BY u.city
    ORDER BY count DESC
    LIMIT 5
  `).bind(eventId).all();

  const eventStats = {
    eventId,
    views: stats?.views || 0,
    uniqueViews: stats?.unique_views || 0,
    rsvps: stats?.rsvps || 0,
    checkins: stats?.checkins || 0,
    referrals: stats?.referrals || 0,
    trend,
    isHot,
    topSources: (sourcesResult.results as SourceRow[]).map((r) => ({
      source: r.source,
      count: r.count,
    })),
    topCities: (citiesResult.results as CityRow[]).map((r) => ({
      city: r.city,
      count: r.count,
    })),
  };

  if (c.env.ANALYTICS) {
    c.env.ANALYTICS.writeDataPoint({
      blobs: [eventId, "stats_view"],
      doubles: [1],
      indexes: [eventId],
    });
  }

  return c.json({ stats: eventStats });
});

// GET /api/events/:id/referrals
events.get("/:id/referrals", async (c) => {
  const eventId = c.req.param("id");
  const { getInitials } = await import("../utils/validation");

  interface LeaderboardRow {
    user_id: string;
    user_name: string | null;
    referral_count: number;
    conversion_count: number;
  }

  const result = await c.env.DB.prepare(`
    SELECT
      r.referrer_user_id as user_id,
      u.name as user_name,
      COUNT(*) as referral_count,
      SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END) as conversion_count
    FROM referrals r
    LEFT JOIN users u ON r.referrer_user_id = u.id
    WHERE r.event_id = ?
    GROUP BY r.referrer_user_id
    ORDER BY conversion_count DESC, referral_count DESC
    LIMIT 10
  `).bind(eventId).all();

  const leaderboard = (result.results as LeaderboardRow[]).map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    userName: row.user_name || "Anonymous",
    userInitials: getInitials(row.user_name || "Anonymous"),
    referralCount: row.referral_count,
    conversionCount: row.conversion_count,
  }));

  return c.json({ leaderboard });
});
