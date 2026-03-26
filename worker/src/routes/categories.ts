import { Hono } from "hono";
import type { Env } from "../types";

export const categories = new Hono<{ Bindings: Env }>();

// GET /api/categories — DB only, no hardcoded fallback
categories.get("/categories", async (c) => {
  const dbResult = await c.env.DB.prepare(
    "SELECT id, name, group_name as 'group', icon, sort_order FROM categories ORDER BY sort_order, name"
  ).all();

  return c.json({ categories: dbResult.results || [] });
});

// GET /api/cities — derived from actual event data in DB
categories.get("/cities", async (c) => {
  const dbResult = await c.env.DB.prepare(
    "SELECT DISTINCT location_locality as city, location_country as country FROM events WHERE location_locality IS NOT NULL AND is_published = TRUE ORDER BY location_country, location_locality"
  ).all();

  return c.json({ cities: dbResult.results || [] });
});
