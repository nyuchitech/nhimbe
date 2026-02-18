import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
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
    "SELECT id, capacity, attendee_count, is_published, is_cancelled FROM events WHERE id = ?"
  ).bind(body.event_id).first() as { id: string; capacity: number | null; attendee_count: number; is_published: boolean; is_cancelled: boolean } | null;

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (!event.is_published || event.is_cancelled) {
    return c.json({ error: "Event is not available for registration" }, 400);
  }

  if (event.capacity && event.attendee_count >= event.capacity) {
    return c.json({ error: "Event is at capacity" }, 400);
  }

  const existingReg = await c.env.DB.prepare(
    "SELECT id FROM registrations WHERE event_id = ? AND user_id = ? AND status NOT IN ('cancelled', 'rejected')"
  ).bind(body.event_id, body.user_id).first();

  if (existingReg) {
    return c.json({ error: "User is already registered for this event" }, 400);
  }

  const id = generateId();

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

  await c.env.DB.prepare(
    "UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?"
  ).bind(body.event_id).run();

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
    SELECT r.*, e.host_name, e.host_handle
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ?
  `).bind(regId).first() as { id: string; user_id: string; event_id: string; host_name: string; host_handle: string } | null;

  if (!reg) {
    return c.json({ error: "Registration not found" }, 404);
  }

  if (body.user_id) {
    const requestingUser = body.user_id;
    const isHost = reg.host_handle === `@${requestingUser}` ||
                   reg.host_name?.toLowerCase() === requestingUser.toLowerCase();
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
      "UPDATE events SET attendee_count = attendee_count - 1 WHERE id = ?"
    ).bind(reg.event_id).run();
  }

  return c.json({ message: "Registration cancelled" });
});
