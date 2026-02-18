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
      COUNT(DISTINCT host_handle) as active_hosts
    FROM events
    WHERE is_published = TRUE AND is_cancelled = FALSE
  `;
  const params: string[] = [];

  if (city) {
    statsQuery += " AND location_city = ?";
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
       AND e2.created_at < datetime('now', '-7 days')
       ${city ? "AND e2.location_city = ?" : ""}
      ) as last_week
    FROM events
    WHERE created_at >= datetime('now', '-7 days')
    ${city ? "AND location_city = ?" : ""}
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
    SELECT location_venue as venue, COUNT(*) as count
    FROM events
    WHERE is_published = TRUE
    ${city ? "AND location_city = ?" : ""}
    GROUP BY location_venue
    ORDER BY count DESC
    LIMIT 5
  `;

  const venueParams = city ? [city] : [];
  const venuesResult = await c.env.DB.prepare(venueQuery).bind(...venueParams).all();

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
    peakTime: "Wed 6-8pm",
    popularVenues: (venuesResult.results as VenueRow[]).map((row) => ({
      venue: row.venue,
      events: row.count,
    })),
  };

  return c.json({ stats: communityStats });
});
