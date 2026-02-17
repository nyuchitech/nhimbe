/**
 * Admin dashboard routes — MongoDB-backed, schema.org field names.
 * All routes require authentication + role-based access.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SupportMessage, TicketStatus } from "../schema.js";
import type { UserRole } from "../types.js";
import {
  events as eventsCol,
  persons,
  registrations,
  supportTickets as ticketsCol,
  supportMessages as messagesCol,
  analyticsEvents,
} from "../mongodb.js";
import { generateId, safeParseInt } from "../utils.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// All admin routes require auth
router.use("*", requireAuth());

// ── GET /stats — Dashboard statistics ───────────────────────────────
router.get("/stats", requireRole("moderator"), async (c) => {
  const mongo = c.get("mongodb");

  const [
    totalUsers,
    totalEvents,
    totalRegistrations,
    activeEvents,
    openTickets,
  ] = await Promise.all([
    persons(mongo).countDocuments(),
    eventsCol(mongo).countDocuments(),
    registrations(mongo).countDocuments(),
    eventsCol(mongo).countDocuments({ isPublished: true, eventStatus: "EventScheduled" }),
    ticketsCol(mongo).countDocuments({ status: "open" }),
  ]);

  // Recent views (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentViews = await analyticsEvents(mongo).countDocuments({
    eventType: "view",
    dateCreated: { $gte: sevenDaysAgo },
  });

  // Recent events
  const recentEvents = await eventsCol(mongo)
    .find()
    .sort({ dateCreated: -1 })
    .limit(5)
    .project({ _id: 1, name: 1, category: 1, startDate: 1, attendeeCount: 1, dateCreated: 1 })
    .toArray();

  // Recent users
  const recentUsers = await persons(mongo)
    .find()
    .sort({ dateCreated: -1 })
    .limit(5)
    .project({ _id: 1, name: 1, email: 1, role: 1, dateCreated: 1 })
    .toArray();

  return c.json({
    totalUsers,
    totalEvents,
    totalRegistrations,
    activeEvents,
    recentViews,
    openTickets,
    recentEvents,
    recentUsers,
  });
});

// ── GET /users — List users ─────────────────────────────────────────
router.get("/users", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const search = url.searchParams.get("search");
  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const col = persons(mongo);
  const [usersList, total] = await Promise.all([
    col.find(filter).sort({ dateCreated: -1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return c.json({ users: usersList, total, limit, offset });
});

// ── POST /users/:id/suspend — Suspend user ──────────────────────────
router.post("/users/:id/suspend", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const adminId = c.get("userId")!;
  const userId = c.req.param("id");

  if (userId === adminId) {
    return c.json({ error: "Cannot suspend yourself" }, 400);
  }

  const col = persons(mongo);
  const user = await col.findOne({ _id: userId });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  await col.updateOne(
    { _id: userId },
    { $set: { role: "user" as const, dateModified: new Date().toISOString() } }
  );

  return c.json({ success: true });
});

// ── POST /users/:id/activate — Activate user ────────────────────────
router.post("/users/:id/activate", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.req.param("id");

  const col = persons(mongo);
  const user = await col.findOne({ _id: userId });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  await col.updateOne(
    { _id: userId },
    { $set: { dateModified: new Date().toISOString() } }
  );

  return c.json({ success: true });
});

// ── POST /users/:id/role — Change user role ─────────────────────────
router.post("/users/:id/role", requireRole("super_admin"), async (c) => {
  const mongo = c.get("mongodb");
  const adminId = c.get("userId")!;
  const userId = c.req.param("id");
  const body = await c.req.json();
  const newRole = body.role as UserRole;

  const validRoles = ["user", "moderator", "admin", "super_admin"];
  if (!newRole || !validRoles.includes(newRole)) {
    return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, 400);
  }

  if (userId === adminId && newRole !== "super_admin") {
    return c.json({ error: "Cannot demote yourself from super_admin" }, 400);
  }

  const col = persons(mongo);
  const user = await col.findOne({ _id: userId });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  await col.updateOne(
    { _id: userId },
    { $set: { role: newRole, dateModified: new Date().toISOString() } }
  );

  const updated = await col.findOne({ _id: userId });
  return c.json({ user: updated });
});

// ── GET /events — List events (admin view) ──────────────────────────
router.get("/events", requireRole("moderator"), async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");
  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }
  if (status === "upcoming") {
    filter.startDate = { $gte: new Date().toISOString() };
    filter.eventStatus = "EventScheduled";
  } else if (status === "past") {
    filter.startDate = { $lt: new Date().toISOString() };
  } else if (status === "cancelled") {
    filter.eventStatus = "EventCancelled";
  }

  const col = eventsCol(mongo);
  const [eventsList, total] = await Promise.all([
    col.find(filter).sort({ dateCreated: -1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return c.json({ events: eventsList, total, limit, offset });
});

// ── DELETE /events/:id — Delete event (admin) ───────────────────────
router.delete("/events/:id", requireRole("moderator"), async (c) => {
  const mongo = c.get("mongodb");
  const id = c.req.param("id");

  const col = eventsCol(mongo);
  const event = await col.findOne({ _id: id });
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  await col.deleteOne({ _id: id });
  await registrations(mongo).deleteMany({ event: id });

  return c.json({ success: true, _vectorizeRemove: id });
});

// ── GET /support — Support tickets ──────────────────────────────────
router.get("/support", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");
  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 50);
  const offset = safeParseInt(url.searchParams.get("offset"), 0);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) filter.status = status;

  const col = ticketsCol(mongo);
  const [tickets, total] = await Promise.all([
    col.find(filter).sort({ dateCreated: -1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  // Get messages for each ticket
  const msgCol = messagesCol(mongo);
  const enriched = await Promise.all(
    tickets.map(async (ticket) => {
      const messages = await msgCol
        .find({ ticketId: ticket._id })
        .sort({ dateCreated: 1 })
        .toArray();
      return { ...ticket, messages };
    })
  );

  return c.json({ tickets: enriched, total, limit, offset });
});

// ── PUT /support/:id/status — Update ticket status ──────────────────
router.put("/support/:id/status", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const id = c.req.param("id");
  const body = await c.req.json();
  const status = body.status as string;

  const validStatuses = ["open", "pending", "resolved"];
  if (!status || !validStatuses.includes(status)) {
    return c.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
  }

  const col = ticketsCol(mongo);
  const ticket = await col.findOne({ _id: id });
  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  await col.updateOne(
    { _id: id },
    { $set: { status: status as TicketStatus, dateModified: new Date().toISOString() } }
  );

  const updated = await col.findOne({ _id: id });
  return c.json({ ticket: updated });
});

// ── POST /support/:id/reply — Reply to ticket ──────────────────────
router.post("/support/:id/reply", requireRole("admin"), async (c) => {
  const mongo = c.get("mongodb");
  const adminId = c.get("userId")!;
  const ticketId = c.req.param("id");
  const body = await c.req.json();
  const content = body.content as string;

  if (!content) {
    return c.json({ error: "content is required" }, 400);
  }

  const ticket = await ticketsCol(mongo).findOne({ _id: ticketId });
  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  const message: SupportMessage = {
    _id: generateId(),
    ticketId,
    senderType: "admin",
    senderId: adminId,
    content,
    dateCreated: new Date().toISOString(),
  };

  await messagesCol(mongo).insertOne(message);

  // Update ticket status to pending if it was open
  if (ticket.status === "open") {
    await ticketsCol(mongo).updateOne(
      { _id: ticketId },
      { $set: { status: "pending", dateModified: new Date().toISOString() } }
    );
  }

  return c.json({ message }, 201);
});

export default router;
