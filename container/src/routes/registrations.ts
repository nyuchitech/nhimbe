/**
 * Registration routes — MongoDB-backed, schema.org field names.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaRegistration } from "../schema.js";
import { registrations as regCol, events as eventsCol, persons } from "../mongodb.js";
import { generateId } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET / — List registrations ──────────────────────────────────────
router.get("/", async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const eventId = url.searchParams.get("event");
  const userId = url.searchParams.get("agent");

  if (!eventId && !userId) {
    return c.json({ error: "event or agent query parameter required" }, 400);
  }

  const filter: Record<string, unknown> = {};
  if (eventId) filter.event = eventId;
  if (userId) filter.agent = userId;

  const col = regCol(mongo);
  const regs = await col.find(filter).sort({ dateCreated: -1 }).toArray();

  // Enrich with user info
  const personCol = persons(mongo);
  const enriched = await Promise.all(
    regs.map(async (reg) => {
      const user = await personCol.findOne({ _id: reg.agent });
      return {
        ...reg,
        userName: user?.name || "Unknown",
        userInitials: user?.name
          ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
          : "??",
      };
    })
  );

  return c.json({ registrations: enriched });
});

// ── POST / — Register for event ─────────────────────────────────────
router.post("/", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const body = await c.req.json();
  const eventId = body.event as string;

  if (!eventId) {
    return c.json({ error: "event is required" }, 400);
  }

  // Check event exists
  const event = await eventsCol(mongo).findOne({ _id: eventId });
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  // Check capacity
  if (event.maximumAttendeeCapacity && event.attendeeCount >= event.maximumAttendeeCapacity) {
    return c.json({ error: "Event is at capacity" }, 409);
  }

  // Check duplicate
  const col = regCol(mongo);
  const existing = await col.findOne({ event: eventId, agent: userId });
  if (existing) {
    return c.json({ error: "Already registered" }, 409);
  }

  const registration: SchemaRegistration = {
    _id: generateId(),
    event: eventId,
    agent: userId,
    rsvpResponse: event.eventStatus === "EventScheduled" ? "registered" : "pending",
    ticketType: body.ticketType as string | undefined,
    ticketPrice: body.ticketPrice as number | undefined,
    ticketCurrency: body.ticketCurrency as string | undefined,
    dateCreated: new Date().toISOString(),
  };

  await col.insertOne(registration);

  // Increment attendee count
  await eventsCol(mongo).updateOne(
    { _id: eventId },
    { $inc: { attendeeCount: 1 } }
  );

  // Increment user's events attended
  await persons(mongo).updateOne(
    { _id: userId },
    { $inc: { eventsAttended: 1 }, $set: { dateModified: new Date().toISOString() } }
  );

  return c.json({ registration }, 201);
});

// ── PUT /:id — Update registration status ───────────────────────────
router.put("/:id", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const status = body.rsvpResponse as string;

  const validStatuses = ["pending", "registered", "approved", "rejected", "cancelled", "attended"];
  if (!status || !validStatuses.includes(status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
  }

  const col = regCol(mongo);
  const reg = await col.findOne({ _id: id });
  if (!reg) {
    return c.json({ error: "Registration not found" }, 404);
  }

  // Only the event organizer or the registrant can update
  const event = await eventsCol(mongo).findOne({ _id: reg.event });
  const isOrganizer = event?.organizer.identifier === userId;
  const isRegistrant = reg.agent === userId;
  if (!isOrganizer && !isRegistrant) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const updates: Record<string, unknown> = { rsvpResponse: status };
  if (status === "cancelled") {
    updates.dateCancelled = new Date().toISOString();
  }

  await col.updateOne({ _id: id }, { $set: updates });

  // Adjust attendee count for cancellations
  if (status === "cancelled" && reg.rsvpResponse !== "cancelled") {
    await eventsCol(mongo).updateOne(
      { _id: reg.event },
      { $inc: { attendeeCount: -1 } }
    );
  }

  const updated = await col.findOne({ _id: id });
  return c.json({ registration: updated });
});

// ── DELETE /:id — Cancel registration ───────────────────────────────
router.delete("/:id", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const col = regCol(mongo);
  const reg = await col.findOne({ _id: id });
  if (!reg) {
    return c.json({ error: "Registration not found" }, 404);
  }

  if (reg.agent !== userId) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  await col.deleteOne({ _id: id });

  // Decrement attendee count
  if (reg.rsvpResponse !== "cancelled") {
    await eventsCol(mongo).updateOne(
      { _id: reg.event },
      { $inc: { attendeeCount: -1 } }
    );
  }

  return c.json({ success: true });
});

export default router;
