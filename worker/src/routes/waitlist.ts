import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { getAuthenticatedUser } from "../auth/stytch";
import { generateId } from "../utils/ids";

export const waitlist = new Hono<{ Bindings: Env }>();
waitlist.use("*", writeAuth);

// POST /api/events/:eventId/waitlist — Join waitlist
waitlist.post("/events/:eventId/waitlist", async (c) => {
  const eventId = c.req.param("eventId");
  const body = await c.req.json() as { userId: string };

  if (!body.userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  // Check if event exists and has a capacity limit
  const event = await c.env.DB.prepare(
    "SELECT _id, maximum_attendee_capacity FROM events WHERE _id = ?"
  ).bind(eventId).first() as { _id: string; maximum_attendee_capacity: number | null } | null;

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (!event.maximum_attendee_capacity) {
    return c.json({ error: "Event has no capacity limit — no waitlist needed" }, 400);
  }

  // Check current registration count
  const regCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status != 'cancelled'"
  ).bind(eventId).first() as { count: number } | null;

  if ((regCount?.count || 0) < event.maximum_attendee_capacity) {
    return c.json({ error: "Event is not at capacity — register directly instead" }, 400);
  }

  // Check if user is already on the waitlist
  const existing = await c.env.DB.prepare(
    "SELECT id FROM waitlists WHERE event_id = ? AND user_id = ?"
  ).bind(eventId, body.userId).first();

  if (existing) {
    return c.json({ error: "User is already on the waitlist" }, 409);
  }

  // Get next position
  const maxPos = await c.env.DB.prepare(
    "SELECT MAX(position) as max_pos FROM waitlists WHERE event_id = ?"
  ).bind(eventId).first() as { max_pos: number | null } | null;

  const position = (maxPos?.max_pos || 0) + 1;
  const id = generateId();

  await c.env.DB.prepare(
    "INSERT INTO waitlists (id, event_id, user_id, position) VALUES (?, ?, ?, ?)"
  ).bind(id, eventId, body.userId, position).run();

  return c.json({ id, position, message: "Added to waitlist" }, 201);
});

// DELETE /api/events/:eventId/waitlist — Leave waitlist
waitlist.delete("/events/:eventId/waitlist", async (c) => {
  const eventId = c.req.param("eventId");
  const body = await c.req.json() as { userId: string };

  if (!body.userId) {
    return c.json({ error: "userId is required" }, 400);
  }

  const result = await c.env.DB.prepare(
    "DELETE FROM waitlists WHERE event_id = ? AND user_id = ?"
  ).bind(eventId, body.userId).run();

  if (!result.meta.changes) {
    return c.json({ error: "User not found on waitlist" }, 404);
  }

  return c.json({ message: "Removed from waitlist" });
});

// GET /api/events/:eventId/waitlist — Get waitlist for event (requires auth)
waitlist.get("/events/:eventId/waitlist", async (c) => {
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (!authResult.user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const eventId = c.req.param("eventId");

  // Only return names (not emails) unless the requester is the event host
  const event = await c.env.DB.prepare(
    "SELECT organizer_identifier FROM events WHERE _id = ?"
  ).bind(eventId).first() as { organizer_identifier: string } | null;

  const isHost = event?.organizer_identifier === authResult.user.userId;

  const result = await c.env.DB.prepare(
    "SELECT w.id, w.event_id, w.user_id, w.position, w.created_at, u.name as user_name FROM waitlists w LEFT JOIN users u ON w.user_id = u._id WHERE w.event_id = ? ORDER BY w.position ASC"
  ).bind(eventId).all();

  interface WaitlistRow {
    id: string;
    event_id: string;
    user_id: string;
    position: number;
    created_at: string;
    user_name: string | null;
    user_email?: string;
  }

  const waitlistEntries = (result.results as WaitlistRow[]).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    position: row.position,
    userName: row.user_name,
    ...(isHost ? { userEmail: row.user_email } : {}),
    createdAt: row.created_at,
  }));

  return c.json({
    waitlist: waitlistEntries,
    total: waitlistEntries.length,
  });
});
