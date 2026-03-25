import { Hono } from "hono";
import type { Env, Event } from "../types";
import { safeParseInt, slugify, getInitials } from "../utils/validation";
import { generateId, generateShortCode } from "../utils/ids";
import { dbRowToEvent } from "../utils/db";
import { writeAuth } from "../middleware/auth";
import { indexEvent, removeEventFromIndex } from "../ai/embeddings";
import { toCsv } from "../utils/export";

export const events = new Hono<{ Bindings: Env }>();

// Write operations require API key or allowed origin
events.use("*", writeAuth);

// GET /api/events
events.get("/", async (c) => {
  const city = c.req.query("city");
  const category = c.req.query("category");
  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);

  let whereClause = "WHERE is_published = TRUE AND event_status = 'EventScheduled'";
  const params: unknown[] = [];
  const countParams: unknown[] = [];

  if (city) {
    whereClause += " AND location_locality = ?";
    params.push(city);
    countParams.push(city);
  }
  if (category) {
    whereClause += " AND category = ?";
    params.push(category);
    countParams.push(category);
  }

  // Get total count for accurate pagination
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM events ${whereClause}`
  ).bind(...countParams).first() as { total: number } | null;
  const total = countResult?.total || 0;

  const query = `SELECT * FROM events ${whereClause} ORDER BY start_date ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();
  const eventsList = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));

  return c.json({
    events: eventsList,
    pagination: { limit, offset, total },
  });
});

// GET /api/events/trending (MUST be before /:id)
events.get("/trending", async (c) => {
  const city = c.req.query("city");
  const limit = safeParseInt(c.req.query("limit") || null, 10, 1, 50);

  let query = `
    SELECT e.*,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e._id) as views,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e._id AND viewed_at >= datetime('now', '-7 days')) as recent_views
    FROM events e
    WHERE e.is_published = TRUE AND e.event_status = 'EventScheduled'
    AND e.start_date >= datetime('now')
  `;
  const params: (string | number)[] = [];

  if (city) {
    query += " AND e.location_locality = ?";
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

  const result = await c.env.DB.prepare(
    "SELECT * FROM events WHERE _id = ? OR slug = ? OR short_code = ?"
  )
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
  const slug = body.slug || slugify(body.name || "");

  await c.env.DB.prepare(`
    INSERT INTO events (
      _id, short_code, slug, name, description,
      start_date, end_date,
      date_display_day, date_display_month, date_display_full, date_display_time,
      location_name, location_street_address, location_locality, location_country, location_url,
      category, keywords, image, cover_gradient,
      attendee_count, maximum_attendee_capacity,
      event_attendance_mode, event_status,
      meeting_url, meeting_platform,
      organizer_name, organizer_alternate_name, organizer_initials, organizer_identifier, organizer_event_count,
      offer_price, offer_price_currency, offer_url, offer_availability
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    shortCode,
    slug,
    body.name,
    body.description,
    body.startDate,
    body.endDate || null,
    body.date?.day,
    body.date?.month,
    body.date?.full,
    body.date?.time,
    body.location?.name,
    body.location?.streetAddress || null,
    body.location?.addressLocality,
    body.location?.addressCountry,
    body.location?.url || null,
    body.category,
    JSON.stringify(body.keywords || []),
    body.image || null,
    body.coverGradient || null,
    body.attendeeCount || 0,
    body.maximumAttendeeCapacity || null,
    body.eventAttendanceMode || "OfflineEventAttendanceMode",
    body.eventStatus || "EventScheduled",
    body.meetingUrl || null,
    body.meetingPlatform || null,
    body.organizer?.name,
    body.organizer?.alternateName || null,
    body.organizer?.initials || getInitials(body.organizer?.name || ""),
    body.organizer?.identifier || null,
    body.organizer?.eventCount || 0,
    body.offers?.price || null,
    body.offers?.priceCurrency || null,
    body.offers?.url || null,
    body.offers?.availability || (body.offers?.price ? "InStock" : "Free"),
  ).run();

  const event: Event = {
    id,
    shortCode,
    slug,
    name: body.name || "",
    description: body.description || "",
    startDate: body.startDate || "",
    endDate: body.endDate,
    date: body.date!,
    location: body.location!,
    category: body.category || "",
    keywords: body.keywords || [],
    image: body.image,
    coverGradient: body.coverGradient,
    attendeeCount: body.attendeeCount || 0,
    maximumAttendeeCapacity: body.maximumAttendeeCapacity,
    eventAttendanceMode: body.eventAttendanceMode || "OfflineEventAttendanceMode",
    eventStatus: body.eventStatus || "EventScheduled",
    meetingUrl: body.meetingUrl,
    meetingPlatform: body.meetingPlatform,
    organizer: body.organizer!,
    offers: body.offers,
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

  if (body.name) { updates.push("name = ?"); params.push(body.name); }
  if (body.description) { updates.push("description = ?"); params.push(body.description); }
  if (body.category) { updates.push("category = ?"); params.push(body.category); }
  if (body.keywords) { updates.push("keywords = ?"); params.push(JSON.stringify(body.keywords)); }
  if (body.eventStatus) { updates.push("event_status = ?"); params.push(body.eventStatus); }

  updates.push("date_modified = datetime('now')");
  params.push(eventId);

  await c.env.DB.prepare(
    `UPDATE events SET ${updates.join(", ")} WHERE _id = ?`
  ).bind(...params).run();

  const result = await c.env.DB.prepare("SELECT * FROM events WHERE _id = ?")
    .bind(eventId)
    .first();

  if (result) {
    await indexEvent(c.env.AI, c.env.VECTORIZE, dbRowToEvent(result as Record<string, unknown>));
  }

  return c.json({ message: "Event updated successfully" });
});

// POST /api/events/:id/cancel — Cancel an event (does NOT delete)
events.post("/:id/cancel", async (c) => {
  const eventId = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT _id, event_status FROM events WHERE _id = ?"
  ).bind(eventId).first() as { _id: string; event_status: string } | null;

  if (!existing) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (existing.event_status === "EventCancelled") {
    return c.json({ error: "Event is already cancelled" }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE events SET event_status = 'EventCancelled', date_modified = datetime('now') WHERE _id = ?"
  ).bind(eventId).run();

  return c.json({ eventId, eventStatus: "EventCancelled", message: "Event cancelled successfully" });
});

// DELETE /api/events/:id
events.delete("/:id", async (c) => {
  const eventId = c.req.param("id");

  await c.env.DB.prepare("DELETE FROM events WHERE _id = ?").bind(eventId).run();
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
    date_created: string;
    user_name: string | null;
  }

  const reviewsResult = await c.env.DB.prepare(`
    SELECT r.*, u.name as user_name
    FROM event_reviews r
    LEFT JOIN users u ON r.user_id = u._id
    WHERE r.event_id = ?
    ORDER BY r.helpful_count DESC, r.date_created DESC
    LIMIT 50
  `).bind(eventId).all();

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
    createdAt: row.date_created,
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
      (SELECT COUNT(DISTINCT COALESCE(user_id, source)) FROM event_views WHERE event_id = ?) as unique_views,
      (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND status != 'cancelled') as rsvps,
      (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND checked_in_at IS NOT NULL) as checkins,
      (SELECT COUNT(*) FROM referrals WHERE event_id = ? AND status = 'converted') as referrals,
      (SELECT COUNT(*) FROM event_views WHERE event_id = ? AND viewed_at < datetime('now', '-7 days')) as views_7_days_ago
  `).bind(eventId, eventId, eventId, eventId, eventId, eventId).first() as StatsRow | null;

  const currentViews = stats?.views || 0;
  const lastWeekViews = stats?.views_7_days_ago || 0;
  const recentViews = currentViews - lastWeekViews;
  const trend = lastWeekViews > 0 ? Math.round(((recentViews - lastWeekViews) / lastWeekViews) * 100) : 0;
  const isHot = trend > 50 || (currentViews > 100 && trend > 20);

  return c.json({
    eventId,
    views: currentViews,
    uniqueViews: stats?.unique_views || 0,
    rsvps: stats?.rsvps || 0,
    checkins: stats?.checkins || 0,
    referrals: stats?.referrals || 0,
    trend,
    isHot,
  });
});

// GET /api/events/:id/registrations/export — Export registrations as CSV
events.get("/:id/registrations/export", async (c) => {
  const eventId = c.req.param("id");
  const format = c.req.query("format") || "csv";

  if (format !== "csv") {
    return c.json({ error: "Only CSV format is currently supported" }, 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT r.id, r.user_id, r.status, r.created_at, r.checked_in_at,
           u.name as user_name, u.email as user_email
    FROM registrations r
    LEFT JOIN users u ON r.user_id = u._id
    WHERE r.event_id = ?
    ORDER BY r.created_at ASC
  `).bind(eventId).all();

  const rows = result.results as Record<string, unknown>[];
  const csv = toCsv(rows, ["id", "user_id", "user_name", "user_email", "status", "created_at", "checked_in_at"]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="registrations-${eventId}.csv"`,
    },
  });
});
