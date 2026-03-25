import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";

export const checkin = new Hono<{ Bindings: Env }>();
checkin.use("*", writeAuth);

// POST /api/events/:eventId/checkin — Check in a registration
checkin.post("/events/:eventId/checkin", async (c) => {
  const eventId = c.req.param("eventId");
  const body = await c.req.json() as { registrationId: string };

  if (!body.registrationId) {
    return c.json({ error: "registrationId is required" }, 400);
  }

  // Verify registration exists for this event
  const registration = await c.env.DB.prepare(
    "SELECT id, status, checked_in_at FROM registrations WHERE id = ? AND event_id = ?"
  ).bind(body.registrationId, eventId).first() as { id: string; status: string; checked_in_at: string | null } | null;

  if (!registration) {
    return c.json({ error: "Registration not found for this event" }, 404);
  }

  if (registration.checked_in_at) {
    return c.json({ error: "Already checked in", checkedInAt: registration.checked_in_at }, 409);
  }

  await c.env.DB.prepare(
    "UPDATE registrations SET status = 'attended', checked_in_at = datetime('now') WHERE id = ?"
  ).bind(body.registrationId).run();

  return c.json({ message: "Check-in successful", registrationId: body.registrationId });
});

// GET /api/events/:eventId/checkin/stats — Check-in statistics
checkin.get("/events/:eventId/checkin/stats", async (c) => {
  const eventId = c.req.param("eventId");

  interface StatsRow {
    total: number;
    attended: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) as attended
    FROM registrations
    WHERE event_id = ? AND status != 'cancelled'
  `).bind(eventId).first() as StatsRow | null;

  const total = stats?.total || 0;
  const attended = stats?.attended || 0;

  return c.json({
    eventId,
    total,
    attended,
    remaining: total - attended,
    rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  });
});
