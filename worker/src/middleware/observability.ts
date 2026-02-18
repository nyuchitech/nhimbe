import { createMiddleware } from "hono/factory";
import type { Env, AppVariables } from "../types";

export const requestId = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const id = c.req.header("X-Request-ID") || crypto.randomUUID();
    c.set("requestId", id);
    c.header("X-Request-ID", id);
    await next();
  }
);

export const requestLogger = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";

    console.log(
      JSON.stringify({
        level,
        requestId: c.get("requestId"),
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: duration,
        userAgent: c.req.header("User-Agent")?.substring(0, 100),
      })
    );
  }
);
