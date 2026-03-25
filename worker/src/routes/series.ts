import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/ids";
import { writeAuth } from "../middleware/auth";

export const series = new Hono<{ Bindings: Env }>();

// Apply writeAuth to all POST/PUT/DELETE operations
series.use("*", writeAuth);

// POST /api/series — Create a new event series
series.post("/", async (c) => {
  const body = await c.req.json() as {
    title: string;
    recurrenceRule: string;
    hostId: string;
    templateEventId?: string;
    maxOccurrences?: number;
    endsAt?: string;
  };

  if (!body.title || !body.recurrenceRule || !body.hostId) {
    return c.json({ error: "title, recurrenceRule, and hostId are required" }, 400);
  }

  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO event_series (id, title, recurrence_rule, host_id, template_event_id, max_occurrences, ends_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.title,
    body.recurrenceRule,
    body.hostId,
    body.templateEventId || null,
    body.maxOccurrences ?? 52,
    body.endsAt || null,
  ).run();

  return c.json({ id, message: "Series created" }, 201);
});

// GET /api/series/:id — Get series details
series.get("/:id", async (c) => {
  const id = c.req.param("id");

  interface SeriesRow {
    id: string;
    title: string;
    recurrence_rule: string;
    host_id: string;
    template_event_id: string | null;
    max_occurrences: number;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
  }

  const row = await c.env.DB.prepare(
    "SELECT * FROM event_series WHERE id = ?"
  ).bind(id).first() as SeriesRow | null;

  if (!row) {
    return c.json({ error: "Series not found" }, 404);
  }

  return c.json({
    id: row.id,
    title: row.title,
    recurrenceRule: row.recurrence_rule,
    hostId: row.host_id,
    templateEventId: row.template_event_id,
    maxOccurrences: row.max_occurrences,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

// PUT /api/series/:id — Update series
series.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json() as {
    title?: string;
    recurrenceRule?: string;
    maxOccurrences?: number;
    endsAt?: string;
  };

  interface SeriesRow {
    id: string;
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM event_series WHERE id = ?"
  ).bind(id).first() as SeriesRow | null;

  if (!existing) {
    return c.json({ error: "Series not found" }, 404);
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.title !== undefined) {
    updates.push("title = ?");
    values.push(body.title);
  }
  if (body.recurrenceRule !== undefined) {
    updates.push("recurrence_rule = ?");
    values.push(body.recurrenceRule);
  }
  if (body.maxOccurrences !== undefined) {
    updates.push("max_occurrences = ?");
    values.push(body.maxOccurrences);
  }
  if (body.endsAt !== undefined) {
    updates.push("ends_at = ?");
    values.push(body.endsAt);
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE event_series SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...values).run();

  return c.json({ message: "Series updated" });
});

// DELETE /api/series/:id — Cancel series and mark future events as cancelled
series.delete("/:id", async (c) => {
  const id = c.req.param("id");

  interface SeriesRow {
    id: string;
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM event_series WHERE id = ?"
  ).bind(id).first() as SeriesRow | null;

  if (!existing) {
    return c.json({ error: "Series not found" }, 404);
  }

  // Cancel all future events in the series
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    UPDATE events SET status = 'EventCancelled', updated_at = datetime('now')
    WHERE series_id = ? AND start_date > ?
  `).bind(id, now).run();

  // Delete the series record
  await c.env.DB.prepare(
    "DELETE FROM event_series WHERE id = ?"
  ).bind(id).run();

  return c.json({ message: "Series cancelled and future events updated" });
});

// GET /api/series/:id/events — List events in the series
series.get("/:id/events", async (c) => {
  const id = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  interface EventRow {
    _id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    status: string;
    series_index: number | null;
  }

  const { results } = await c.env.DB.prepare(`
    SELECT _id, title, start_date, end_date, status, series_index
    FROM events
    WHERE series_id = ?
    ORDER BY series_index ASC, start_date ASC
    LIMIT ? OFFSET ?
  `).bind(id, limit, offset).all() as { results: EventRow[] };

  return c.json({
    events: results.map((row) => ({
      id: row._id,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      seriesIndex: row.series_index,
    })),
    pagination: { limit, offset, count: results.length },
  });
});
