import { Hono } from "hono";
import type { Env } from "../types";

export const categories = new Hono<{ Bindings: Env }>();

// Hardcoded fallback ensures the events form is usable even if the
// categories table is missing/migrating or the query fails.
const FALLBACK_CATEGORIES = [
  { id: "tech", name: "Technology", group: "Technology & Innovation", sort_order: 0 },
  { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation", sort_order: 1 },
  { id: "business", name: "Business", group: "Business & Economy", sort_order: 4 },
  { id: "music", name: "Music", group: "Entertainment & Media", sort_order: 8 },
  { id: "film-tv", name: "Film & TV", group: "Entertainment & Media", sort_order: 9 },
  { id: "football", name: "Football", group: "Sports", sort_order: 12 },
  { id: "fitness", name: "Fitness & Wellness", group: "Sports", sort_order: 14 },
  { id: "culture", name: "Culture & Society", group: "Culture & Society", sort_order: 15 },
  { id: "food", name: "Food & Drink", group: "Culture & Society", sort_order: 17 },
  { id: "education", name: "Education", group: "Education & Knowledge", sort_order: 22 },
  { id: "art", name: "Art", group: "Creative Arts", sort_order: 28 },
  { id: "comedy", name: "Comedy", group: "Creative Arts", sort_order: 30 },
];

// GET /api/categories — DB with hardcoded fallback when the query fails
// (missing table, schema drift, etc.) so event creation never breaks.
categories.get("/categories", async (c) => {
  try {
    const dbResult = await c.env.DB.prepare(
      "SELECT id, name, group_name as 'group', sort_order FROM categories ORDER BY sort_order, name"
    ).all();
    return c.json({ categories: dbResult.results || [] });
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      module: "categories",
      message: "Failed to load categories from DB, returning fallback",
      error: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ categories: FALLBACK_CATEGORIES });
  }
});

// GET /api/cities — derived from actual event data in DB (empty array on failure)
categories.get("/cities", async (c) => {
  try {
    const dbResult = await c.env.DB.prepare(
      "SELECT DISTINCT location_locality as addressLocality, location_country as addressCountry FROM events WHERE location_locality IS NOT NULL AND is_published = TRUE ORDER BY location_country, location_locality"
    ).all();
    return c.json({ cities: dbResult.results || [] });
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      module: "cities",
      message: "Failed to load cities from DB",
      error: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ cities: [] });
  }
});
