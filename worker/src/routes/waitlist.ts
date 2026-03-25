import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
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

// GET /api/events/:eventId/waitlist — Get waitlist for event
waitlist.get("/events/:eventId/waitlist", async (c) => {
  const eventId = c.req.param("eventId");

  const result = await c.env.DB.prepare(
    "SELECT w.*, u.name as user_name, u.email as user_email FROM waitlists w LEFT JOIN users u ON w.user_id = u._id WHERE w.event_id = ? ORDER BY w.position ASC"
  ).bind(eventId).all();

  return c.json({
    waitlist: result.results,
    total: result.results.length,
  });
});
