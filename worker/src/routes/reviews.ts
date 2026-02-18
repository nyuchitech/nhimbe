import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/ids";

export const reviews = new Hono<{ Bindings: Env }>();

// POST /api/reviews/:id/helpful
reviews.post("/:id/helpful", async (c) => {
  const reviewId = c.req.param("id");
  const body = await c.req.json() as { userId: string };

  if (!body.userId) {
    return c.json({ error: "userId required" }, 400);
  }

  try {
    const existing = await c.env.DB.prepare(
      "SELECT id FROM review_helpful_votes WHERE review_id = ? AND user_id = ?"
    ).bind(reviewId, body.userId).first();

    if (existing) {
      return c.json({ error: "Already voted" }, 409);
    }

    await c.env.DB.prepare(
      "INSERT INTO review_helpful_votes (id, review_id, user_id) VALUES (?, ?, ?)"
    ).bind(generateId(), reviewId, body.userId).run();

    await c.env.DB.prepare(
      "UPDATE event_reviews SET helpful_count = helpful_count + 1 WHERE id = ?"
    ).bind(reviewId).run();

    return c.json({ message: "Vote recorded" });
  } catch {
    return c.json({ error: "Failed to record vote" }, 500);
  }
});
