import { Hono } from "hono";
import type { Env, SearchQuery } from "../types";
import { searchEvents, findSimilarEvents, getRecommendations } from "../ai/search";
import { generateSuggestions } from "../ai/assistant";

export const search = new Hono<{ Bindings: Env }>();

// POST /api/search
search.get("/search", async (c) => {
  return c.json({ error: "Method not allowed" }, 405);
});

search.post("/search", async (c) => {
  const body = await c.req.json() as SearchQuery;

  if (!body.query) {
    return c.json({ error: "Query is required" }, 400);
  }

  const result = await searchEvents(c.env.AI, c.env.VECTORIZE, c.env.DB, body);

  await c.env.DB.prepare(
    "INSERT INTO search_queries (query, results_count) VALUES (?, ?)"
  ).bind(body.query, result.totalResults).run();

  return c.json(result);
});

// GET /api/similar/:id
search.get("/similar/:id", async (c) => {
  const eventId = c.req.param("id");

  if (!eventId) {
    return c.json({ error: "Event ID required" }, 400);
  }

  const events = await findSimilarEvents(c.env.AI, c.env.VECTORIZE, c.env.DB, eventId);

  return c.json({ events });
});

// GET /api/recommendations
search.get("/recommendations", async (c) => {
  const city = c.req.query("city") || undefined;
  const interests = c.req.query("interests")?.split(",") || [];

  const suggestions = await generateSuggestions(c.env.AI, c.env.VECTORIZE, c.env.DB, {
    city,
    interests,
  });

  return c.json(suggestions);
});

// POST /api/recommendations
search.post("/recommendations", async (c) => {
  const body = await c.req.json() as { city?: string; interests?: string[] };

  const events = await getRecommendations(
    c.env.AI,
    c.env.VECTORIZE,
    c.env.DB,
    body.interests || [],
    body.city
  );

  return c.json({ events });
});
