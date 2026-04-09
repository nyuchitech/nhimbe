/**
 * Tracked Links — short URL redirect with click analytics
 *
 * Every external link (meeting URLs, venue directions, tickets) goes through
 * /api/links/:code which records the click then 302-redirects to the target.
 *
 * POST /api/links — create a tracked link
 * GET  /api/links/:code — redirect + record click
 * GET  /api/links/event/:eventId — list tracked links for an event
 */
import { Hono } from "hono";
import type { Env, AppVariables } from "../types";
import { generateId, generateShortCode } from "../utils/ids";

const links = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Create a tracked link
links.post("/", async (c) => {
  const body = await c.req.json<{
    targetUrl: string;
    eventId: string;
    linkType: string; // meeting_url, directions, ticket, website
    createdBy?: string;
  }>();

  if (!body.targetUrl || !body.eventId || !body.linkType) {
    return c.json({ error: "targetUrl, eventId, and linkType are required" }, 400);
  }

  // Validate URL
  try {
    new URL(body.targetUrl);
  } catch {
    return c.json({ error: "Invalid target URL" }, 400);
  }

  const db = c.env.DB;

  // Check if we already have a tracked link for this exact URL + event + type
  const existing = await db
    .prepare("SELECT code FROM tracked_links WHERE event_id = ? AND target_url = ? AND link_type = ?")
    .bind(body.eventId, body.targetUrl, body.linkType)
    .first<{ code: string }>();

  if (existing) {
    return c.json({ code: existing.code, url: `/r/${existing.code}` });
  }

  const id = generateId();
  const code = generateShortCode();

  await db
    .prepare(
      "INSERT INTO tracked_links (id, code, event_id, target_url, link_type, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, code, body.eventId, body.targetUrl, body.linkType, body.createdBy || null)
    .run();

  return c.json({ code, url: `/r/${code}` }, 201);
});

// Redirect a tracked link + record click
links.get("/:code", async (c) => {
  const code = c.req.param("code");
  const db = c.env.DB;

  const link = await db
    .prepare("SELECT id, target_url, event_id FROM tracked_links WHERE code = ?")
    .bind(code)
    .first<{ id: string; target_url: string; event_id: string }>();

  if (!link) {
    return c.json({ error: "Link not found" }, 404);
  }

  // Record click asynchronously (don't block redirect)
  c.executionCtx.waitUntil(
    (async () => {
      try {
        const userAgent = c.req.header("user-agent") || "";
        const referrer = c.req.header("referer") || "";

        await db.batch([
          db
            .prepare(
              "INSERT INTO link_clicks (link_id, event_id, referrer_url, user_agent) VALUES (?, ?, ?, ?)"
            )
            .bind(link.id, link.event_id, referrer, userAgent),
          db
            .prepare("UPDATE tracked_links SET click_count = click_count + 1 WHERE id = ?")
            .bind(link.id),
        ]);
      } catch (err) {
        console.error("[mukoko] link click tracking failed:", err);
      }
    })()
  );

  return c.redirect(link.target_url, 302);
});

// List tracked links for an event
links.get("/event/:eventId", async (c) => {
  const eventId = c.req.param("eventId");
  const db = c.env.DB;

  const result = await db
    .prepare(
      "SELECT code, target_url, link_type, click_count, date_created FROM tracked_links WHERE event_id = ? ORDER BY date_created DESC"
    )
    .bind(eventId)
    .all();

  return c.json({ links: result.results });
});

export { links };
