import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!c.env.RATE_LIMITER) {
    await next();
    return;
  }

  const key = c.req.header("CF-Connecting-IP") || "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key });

  if (!success) {
    return c.json({ error: "Rate limit exceeded. Please try again later." }, 429);
  }

  await next();
});
