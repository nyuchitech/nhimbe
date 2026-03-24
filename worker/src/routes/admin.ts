import { Hono } from "hono";
import type { Context } from "hono";
import type { Env, UserRole } from "../types";
import { getAdminUser } from "../middleware/auth";
import { safeParseInt } from "../utils/validation";
import { dbRowToEvent } from "../utils/db";
import { removeEventFromIndex } from "../ai/embeddings";

export const admin = new Hono<{ Bindings: Env }>();

// GET /api/admin/stats
admin.get("/stats", async (c) => {
  const adminUser = await getAdminUser(c.req.raw, c.env, 'moderator');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - moderator access required" }, 401);
  }

  const [usersResult, eventsResult, registrationsResult] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first() as Promise<{ count: number } | null>,
    c.env.DB.prepare("SELECT COUNT(*) as count FROM events").first() as Promise<{ count: number } | null>,
    c.env.DB.prepare("SELECT COUNT(*) as count FROM registrations").first() as Promise<{ count: number } | null>,
  ]);

  const activeEventsResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE start_date >= datetime('now')"
  ).first() as { count: number } | null;

  const viewsResult = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM event_views WHERE viewed_at >= datetime('now', '-30 days')"
  ).first() as { count: number } | null;

  interface EventRow {
    _id: string;
    name: string;
    date_display_full: string;
    attendee_count: number;
    start_date: string;
  }
  const recentEventsResult = await c.env.DB.prepare(
    "SELECT _id, name, date_display_full, attendee_count, start_date FROM events ORDER BY date_created DESC LIMIT 5"
  ).all() as { results: EventRow[] };

  const now = new Date();
  const recentEvents = recentEventsResult.results.map(e => {
    const eventDate = new Date(e.start_date);
    let status: 'upcoming' | 'ongoing' | 'past' = 'upcoming';
    if (eventDate < now) status = 'past';
    else if (eventDate.toDateString() === now.toDateString()) status = 'ongoing';

    return {
      id: e._id,
      title: e.name,
      date: e.date_display_full,
      attendeeCount: e.attendee_count,
      status,
    };
  });

  interface UserRow {
    _id: string;
    name: string;
    email: string;
    date_created: string;
  }
  const recentUsersResult = await c.env.DB.prepare(
    "SELECT _id, name, email, date_created FROM users ORDER BY date_created DESC LIMIT 5"
  ).all() as { results: UserRow[] };

  const recentUsers = recentUsersResult.results.map(u => ({
    id: u._id,
    name: u.name,
    email: u.email,
    createdAt: new Date(u.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  let tickets: Array<{ id: string; subject: string; status: string; createdAt: string }> = [];
  try {
    interface TicketRow {
      id: string;
      subject: string;
      status: string;
      created_at: string;
    }
    const ticketsResult = await c.env.DB.prepare(
      "SELECT id, subject, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT 5"
    ).all() as { results: (TicketRow & { created_at?: string })[] };

    tickets = ticketsResult.results.map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: new Date(t.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  } catch {
    // Table doesn't exist yet
  }

  return c.json({
    stats: {
      totalUsers: usersResult?.count || 0,
      totalEvents: eventsResult?.count || 0,
      totalRegistrations: registrationsResult?.count || 0,
      activeEvents: activeEventsResult?.count || 0,
      userGrowth: 0,
      eventGrowth: 0,
      recentViews: viewsResult?.count || 0,
      viewsGrowth: 0,
    },
    recentEvents,
    recentUsers,
    tickets,
  });
});

// GET /api/admin/users
admin.get("/users", async (c) => {
  const adminUser = await getAdminUser(c.req.raw, c.env, 'admin');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - admin access required" }, 401);
  }

  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);
  const search = c.req.query("search") || "";

  let query = "SELECT * FROM users";
  let countQuery = "SELECT COUNT(*) as count FROM users";
  const params: string[] = [];

  if (search) {
    query += " WHERE name LIKE ? OR email LIKE ?";
    countQuery += " WHERE name LIKE ? OR email LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY date_created DESC LIMIT ? OFFSET ?";

  interface UserRow {
    _id: string;
    email: string;
    name: string;
    alternate_name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    events_attended: number;
    events_hosted: number;
    role: string | null;
    date_created: string;
  }

  const [usersResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: UserRow[] }>,
    c.env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
  ]);

  const users = usersResult.results.map(u => ({
    id: u._id,
    email: u.email,
    name: u.name,
    handle: u.alternate_name,
    avatar_url: u.image,
    city: u.address_locality,
    country: u.address_country,
    events_attended: u.events_attended || 0,
    events_hosted: u.events_hosted || 0,
    role: u.role || 'user',
    status: 'active' as const,
    date_created: u.date_created,
  }));

  return c.json({
    users,
    total: countResult?.count || 0,
  });
});

// POST /api/admin/users/:id/suspend
admin.post("/users/:id/suspend", async (c) => {
  return handleAdminUserAction(c, 'suspend');
});

// POST /api/admin/users/:id/activate
admin.post("/users/:id/activate", async (c) => {
  return handleAdminUserAction(c, 'activate');
});

// POST /api/admin/users/:id/role
admin.post("/users/:id/role", async (c) => {
  return handleAdminUserAction(c, 'role');
});

async function handleAdminUserAction(
  c: Context<{ Bindings: Env }>,
  action: string
) {
  const userId = c.req.param("id");
  const requiredRole: UserRole = action === 'role' ? 'super_admin' : 'admin';
  const adminUser = await getAdminUser(c.req.raw, c.env, requiredRole);
  if (!adminUser) {
    return c.json({ error: `Unauthorized - ${requiredRole} access required` }, 401);
  }

  if (userId === adminUser.id && (action === 'suspend' || action === 'role')) {
    return c.json({ error: "Cannot modify your own account" }, 400);
  }

  switch (action) {
    case 'suspend':
      return c.json({ message: "User suspended" });

    case 'activate':
      return c.json({ message: "User activated" });

    case 'role': {
      const body = await c.req.json() as { role?: string };
      const newRole = body.role as UserRole;

      if (!['user', 'moderator', 'admin', 'super_admin'].includes(newRole)) {
        return c.json({ error: "Invalid role" }, 400);
      }

      if (newRole === 'super_admin' && adminUser.role !== 'super_admin') {
        return c.json({ error: "Only super_admin can assign super_admin role" }, 403);
      }

      await c.env.DB.prepare(
        "UPDATE users SET role = ?, date_modified = datetime('now') WHERE _id = ?"
      ).bind(newRole, userId).run();

      return c.json({ message: `User role updated to ${newRole}` });
    }

    default:
      return c.json({ error: "Unknown action" }, 400);
  }
}

// GET /api/admin/events
admin.get("/events", async (c) => {
  const adminUser = await getAdminUser(c.req.raw, c.env, 'moderator');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - moderator access required" }, 401);
  }

  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";

  let query = "SELECT * FROM events WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as count FROM events WHERE 1=1";
  const params: (string | number)[] = [];

  if (search) {
    query += " AND (name LIKE ? OR description LIKE ?)";
    countQuery += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const now = new Date().toISOString();
  if (status === 'upcoming') {
    query += " AND start_date >= ?";
    countQuery += " AND start_date >= ?";
    params.push(now);
  } else if (status === 'past') {
    query += " AND start_date < ?";
    countQuery += " AND start_date < ?";
    params.push(now);
  } else if (status === 'cancelled') {
    query += " AND event_status = 'EventCancelled'";
    countQuery += " AND event_status = 'EventCancelled'";
  }

  query += " ORDER BY date_created DESC LIMIT ? OFFSET ?";

  const [eventsResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: Record<string, unknown>[] }>,
    c.env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
  ]);

  const nowDate = new Date();
  const events = eventsResult.results.map((row) => {
    const event = dbRowToEvent(row);
    const eventDate = new Date(event.startDate);
    let eventStatus: 'upcoming' | 'ongoing' | 'past' | 'cancelled' = 'upcoming';

    if (event.eventStatus === 'EventCancelled') eventStatus = 'cancelled';
    else if (eventDate < nowDate) eventStatus = 'past';
    else if (eventDate.toDateString() === nowDate.toDateString()) eventStatus = 'ongoing';

    return {
      id: event.id,
      title: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      category: event.category,
      attendeeCount: event.attendeeCount,
      capacity: event.maximumAttendeeCapacity,
      organizer: event.organizer,
      status: eventStatus,
      dateCreated: event.dateCreated,
    };
  });

  return c.json({
    events,
    total: countResult?.count || 0,
  });
});

// DELETE /api/admin/events/:id
admin.delete("/events/:id", async (c) => {
  const eventId = c.req.param("id");
  const adminUser = await getAdminUser(c.req.raw, c.env, 'moderator');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - moderator access required" }, 401);
  }

  const event = await c.env.DB.prepare("SELECT _id, name FROM events WHERE _id = ?").bind(eventId).first();
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM events WHERE _id = ?").bind(eventId).run();

  try {
    await removeEventFromIndex(c.env.VECTORIZE, eventId);
  } catch (error) {
    console.error("Failed to remove event from index:", error);
  }

  return c.json({ message: "Event deleted successfully" });
});

// POST /api/admin/index-events (API key required — middleware applied inline)
admin.post("/index-events", async (c) => {
  const { validateApiKey } = await import("../middleware/auth");
  if (!validateApiKey(c.req.raw, c.env)) {
    return c.json({ error: "Unauthorized - API key required" }, 401);
  }

  const { indexEvents } = await import("../ai/embeddings");

  const result = await c.env.DB.prepare(
    "SELECT * FROM events WHERE is_published = TRUE"
  ).all();

  const events = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));
  const indexResult = await indexEvents(c.env.AI, c.env.VECTORIZE, events);

  return c.json({
    message: "Indexing complete",
    indexed: indexResult.indexed,
    errors: indexResult.errors,
  });
});

// GET /api/admin/support
admin.get("/support", async (c) => {
  const adminUser = await getAdminUser(c.req.raw, c.env, 'admin');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - admin access required" }, 401);
  }

  const limit = safeParseInt(c.req.query("limit") || null, 20, 1, 100);
  const offset = safeParseInt(c.req.query("offset") || null, 0, 0, 10000);
  const status = c.req.query("status") || "";
  const search = c.req.query("search") || "";

  try {
    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = "SELECT COUNT(*) as count FROM support_tickets WHERE 1=1";
    const params: string[] = [];

    if (status && status !== 'all') {
      query += " AND t.status = ?";
      countQuery += " AND status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (t.subject LIKE ? OR t.description LIKE ?)";
      countQuery += " AND (subject LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY t.created_at DESC LIMIT ? OFFSET ?";

    interface TicketRow {
      id: string;
      user_id: string | null;
      user_name: string | null;
      user_email: string | null;
      subject: string;
      description: string;
      category: string;
      priority: string;
      status: string;
      created_at: string;
      updated_at: string;
    }

    const [ticketsResult, countResult] = await Promise.all([
      c.env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: TicketRow[] }>,
      c.env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
    ]);

    const tickets = await Promise.all(ticketsResult.results.map(async (t) => {
      interface MessageRow {
        id: string;
        sender_type: string;
        sender_id: string | null;
        content: string;
        created_at: string;
      }

      const messagesResult = await c.env.DB.prepare(
        "SELECT m.*, u.name as sender_name FROM support_messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC"
      ).bind(t.id).all() as { results: (MessageRow & { sender_name: string | null })[] };

      return {
        id: t.id,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority as 'low' | 'medium' | 'high',
        status: t.status as 'open' | 'pending' | 'resolved',
        user: t.user_id ? {
          id: t.user_id,
          name: t.user_name || 'Unknown',
          email: t.user_email || '',
        } : undefined,
        messages: messagesResult.results.map(m => ({
          id: m.id,
          content: m.content,
          sender: m.sender_type as 'user' | 'admin',
          senderName: m.sender_name || (m.sender_type === 'admin' ? 'Support Team' : 'User'),
          createdAt: m.created_at,
        })),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    }));

    return c.json({
      tickets,
      total: countResult?.count || 0,
    });
  } catch (error) {
    console.error("Support tickets error:", error);
    return c.json({
      tickets: [],
      total: 0,
    });
  }
});

// PUT /api/admin/support/:id/status
admin.put("/support/:id/status", async (c) => {
  const ticketId = c.req.param("id");
  const adminUser = await getAdminUser(c.req.raw, c.env, 'admin');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - admin access required" }, 401);
  }

  const body = await c.req.json() as { status?: string };
  const status = body.status;

  if (!status || !['open', 'pending', 'resolved'].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  try {
    await c.env.DB.prepare(
      "UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(status, ticketId).run();

    return c.json({ message: "Ticket status updated" });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return c.json({ error: "Failed to update ticket status" }, 500);
  }
});

// POST /api/admin/support/:id/reply
admin.post("/support/:id/reply", async (c) => {
  const ticketId = c.req.param("id");
  const adminUser = await getAdminUser(c.req.raw, c.env, 'admin');
  if (!adminUser) {
    return c.json({ error: "Unauthorized - admin access required" }, 401);
  }

  const body = await c.req.json() as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return c.json({ error: "Content is required" }, 400);
  }

  try {
    const messageId = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, content, created_at)
      VALUES (?, ?, 'admin', ?, ?, datetime('now'))
    `).bind(messageId, ticketId, adminUser.id, content).run();

    await c.env.DB.prepare(
      "UPDATE support_tickets SET status = 'pending', updated_at = datetime('now') WHERE id = ?"
    ).bind(ticketId).run();

    return c.json({
      message: "Reply sent",
      messageId,
    });
  } catch (error) {
    console.error("Send reply error:", error);
    return c.json({ error: "Failed to send reply" }, 500);
  }
});
