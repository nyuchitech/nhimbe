import { Hono } from "hono";
import type { Env, CommunityStats } from "../types";

export const stats = new Hono<{ Bindings: Env }>();

// GET /api/community/stats
stats.get("/stats", async (c) => {
  const city = c.req.query("city");

  interface StatsRow {
    total_events: number;
    total_attendees: number;
    active_hosts: number;
  }

  let statsQuery = `
    SELECT
      COUNT(*) as total_events,
      SUM(attendee_count) as total_attendees,
      COUNT(DISTINCT organizer_identifier) as active_hosts
    FROM events
    WHERE is_published = TRUE AND event_status = 'EventScheduled'
  `;
  const params: string[] = [];

  if (city) {
    statsQuery += " AND location_locality = ?";
    params.push(city);
  }

  const statsResult = await c.env.DB.prepare(statsQuery).bind(...params).first() as StatsRow | null;

  interface CategoryRow {
    category: string;
    count: number;
    last_week: number;
  }

  const trendingQuery = `
    SELECT
      category,
      COUNT(*) as count,
      (SELECT COUNT(*) FROM events e2
       WHERE e2.category = events.category
       AND e2.date_created < datetime('now', '-7 days')
       ${city ? "AND e2.location_locality = ?" : ""}
      ) as last_week
    FROM events
    WHERE date_created >= datetime('now', '-7 days')
    ${city ? "AND location_locality = ?" : ""}
    GROUP BY category
    ORDER BY count DESC
    LIMIT 5
  `;

  const trendingParams = city ? [city, city] : [];
  const trendingResult = await c.env.DB.prepare(trendingQuery).bind(...trendingParams).all();

  interface VenueRow {
    venue: string;
    count: number;
  }

  const venueQuery = `
    SELECT location_name as venue, COUNT(*) as count
    FROM events
    WHERE is_published = TRUE
    ${city ? "AND location_locality = ?" : ""}
    GROUP BY location_name
    ORDER BY count DESC
    LIMIT 5
  `;

  const venueParams = city ? [city] : [];
  const venuesResult = await c.env.DB.prepare(venueQuery).bind(...venueParams).all();

  // Calculate peak time from actual event data
  interface PeakRow {
    day_of_week: number;
    hour: number;
    event_count: number;
  }

  const peakQuery = `
    SELECT
      CAST(strftime('%w', start_date) AS INTEGER) as day_of_week,
      CAST(strftime('%H', start_date) AS INTEGER) as hour,
      COUNT(*) as event_count
    FROM events
    WHERE is_published = TRUE
    ${city ? "AND location_locality = ?" : ""}
    GROUP BY day_of_week, hour
    ORDER BY event_count DESC
    LIMIT 1
  `;

  const peakParams = city ? [city] : [];
  const peakResult = await c.env.DB.prepare(peakQuery).bind(...peakParams).first() as PeakRow | null;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peakTime = peakResult
    ? `${dayNames[peakResult.day_of_week]} ${peakResult.hour}:00-${peakResult.hour + 2}:00`
    : "No data yet";

  const communityStats: CommunityStats = {
    city: city || undefined,
    totalEvents: statsResult?.total_events || 0,
    totalAttendees: statsResult?.total_attendees || 0,
    activeHosts: statsResult?.active_hosts || 0,
    trendingCategories: (trendingResult.results as CategoryRow[]).map((row) => ({
      category: row.category,
      change: row.last_week > 0 ? Math.round(((row.count - row.last_week) / row.last_week) * 100) : 100,
      events: row.count,
    })),
    peakTime,
    popularVenues: (venuesResult.results as VenueRow[]).map((row) => ({
      venue: row.venue,
      events: row.count,
    })),
  };

  return c.json({ stats: communityStats });
});

// GET /api/community/events/:eventId/analytics — Host analytics for a specific event
stats.get("/events/:eventId/analytics", async (c) => {
  const eventId = c.req.param("eventId");

  interface AnalyticsRow {
    views: number;
    registrations: number;
    referrals: number;
  }

  const result = await c.env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM event_views WHERE event_id = ?) as views,
      (SELECT COUNT(*) FROM registrations WHERE event_id = ? AND status != 'cancelled') as registrations,
      (SELECT COUNT(*) FROM referrals WHERE event_id = ?) as referrals
  `).bind(eventId, eventId, eventId).first() as AnalyticsRow | null;

  const views = result?.views || 0;
  const registrations = result?.registrations || 0;
  const referrals = result?.referrals || 0;
  const conversionRate = views > 0 ? Math.round((registrations / views) * 10000) / 100 : 0;

  return c.json({
    eventId,
    views,
    registrations,
    conversionRate,
    referrals,
  });
});
