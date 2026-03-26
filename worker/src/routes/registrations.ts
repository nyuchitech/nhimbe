import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { getAuthenticatedUser } from "../auth/stytch";
import { validateRequiredFields } from "../utils/validation";
import { generateId } from "../utils/ids";

export const registrations = new Hono<{ Bindings: Env }>();
registrations.use("*", writeAuth);

// GET /api/registrations
registrations.get("/", async (c) => {
  const eventId = c.req.query("event_id");
  const userId = c.req.query("user_id");

  if (eventId) {
    const result = await c.env.DB.prepare(
      "SELECT * FROM registrations WHERE event_id = ?"
    ).bind(eventId).all();
    return c.json({ registrations: result.results });
  }

  if (userId) {
    const result = await c.env.DB.prepare(
      "SELECT * FROM registrations WHERE user_id = ?"
    ).bind(userId).all();
    return c.json({ registrations: result.results });
  }

  return c.json({ error: "event_id or user_id required" }, 400);
});

// POST /api/registrations
registrations.post("/", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json() as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validateRequiredFields(body, ['event_id', 'user_id']);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const event = await c.env.DB.prepare(
    "SELECT _id, maximum_attendee_capacity, attendee_count, is_published, event_status FROM events WHERE _id = ?"
  ).bind(body.event_id).first() as { _id: string; maximum_attendee_capacity: number | null; attendee_count: number; is_published: boolean; event_status: string } | null;

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (!event.is_published || event.event_status !== 'EventScheduled') {
    return c.json({ error: "Event is not available for registration" }, 400);
  }

  if (event.maximum_attendee_capacity && event.attendee_count >= event.maximum_attendee_capacity) {
    return c.json({ error: "Event is at capacity" }, 400);
  }

  const existingReg = await c.env.DB.prepare(
    "SELECT id FROM registrations WHERE event_id = ? AND user_id = ? AND status NOT IN ('cancelled', 'rejected')"
  ).bind(body.event_id, body.user_id).first();

  if (existingReg) {
    return c.json({ error: "User is already registered for this event" }, 400);
  }

  const id = generateId();

  // Atomic capacity check + increment to prevent race conditions
  // If event has a capacity limit, only increment if still under capacity
  const capacityUpdate = event.maximum_attendee_capacity
    ? await c.env.DB.prepare(
        "UPDATE events SET attendee_count = attendee_count + 1 WHERE _id = ? AND attendee_count < ?"
      ).bind(body.event_id, event.maximum_attendee_capacity).run()
    : await c.env.DB.prepare(
        "UPDATE events SET attendee_count = attendee_count + 1 WHERE _id = ?"
      ).bind(body.event_id).run();

  if (event.maximum_attendee_capacity && !capacityUpdate.meta.changes) {
    return c.json({ error: "Event is at capacity" }, 400);
  }

  await c.env.DB.prepare(`
    INSERT INTO registrations (id, event_id, user_id, ticket_type, ticket_price, ticket_currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.event_id,
    body.user_id,
    body.ticket_type || null,
    body.ticket_price || null,
    body.ticket_currency || null
  ).run();

  return c.json({ id, message: "Registration successful" }, 201);
});

// PUT /api/registrations/:id
registrations.put("/:id", async (c) => {
  const regId = c.req.param("id");
  let body: { status: string; user_id?: string };
  try {
    body = await c.req.json() as { status: string; user_id?: string };
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.status || !["approved", "rejected", "pending", "registered", "attended"].includes(body.status)) {
    return c.json({ error: "Invalid status. Must be: approved, rejected, pending, registered, or attended" }, 400);
  }

  const reg = await c.env.DB.prepare(`
    SELECT r.*, e.organizer_name, e.organizer_identifier
    FROM registrations r
    JOIN events e ON r.event_id = e._id
    WHERE r.id = ?
  `).bind(regId).first() as { id: string; user_id: string; event_id: string; organizer_name: string; organizer_identifier: string } | null;

  if (!reg) {
    return c.json({ error: "Registration not found" }, 404);
  }

  // Extract user identity from JWT — never trust body.user_id for authorization
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  if (authResult.user) {
    const requestingUser = authResult.user.userId;
    const isHost = reg.organizer_identifier === requestingUser;
    const isRegistrant = reg.user_id === requestingUser;

    if (!isHost && ["approved", "rejected", "attended"].includes(body.status)) {
      return c.json({ error: "Only the event host can approve, reject, or mark attendance" }, 403);
    }

    if (!isHost && !isRegistrant) {
      return c.json({ error: "Not authorized to update this registration" }, 403);
    }
  }

  await c.env.DB.prepare(
    "UPDATE registrations SET status = ? WHERE id = ?"
  ).bind(body.status, regId).run();

  return c.json({ message: `Registration ${body.status}` });
});

// DELETE /api/registrations/:id
registrations.delete("/:id", async (c) => {
  const regId = c.req.param("id");

  const reg = await c.env.DB.prepare(
    "SELECT * FROM registrations WHERE id = ?"
  ).bind(regId).first() as { event_id: string } | null;

  if (reg) {
    await c.env.DB.prepare(
      "UPDATE registrations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
    ).bind(regId).run();

    await c.env.DB.prepare(
      "UPDATE events SET attendee_count = attendee_count - 1 WHERE _id = ?"
    ).bind(reg.event_id).run();
  }

  return c.json({ message: "Registration cancelled" });
});
