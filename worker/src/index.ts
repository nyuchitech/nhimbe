/**
 * nhimbe API - Cloudflare Workers (Hono)
 * Events platform with AI-powered search and recommendations
 * Part of the Mukoko ecosystem
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AnalyticsQueueMessage, EmailQueueMessage, AppVariables } from "./types";
import { requestId as requestIdMiddleware, requestLogger } from "./middleware/observability";
import { rateLimit } from "./middleware/rate-limit";
import { processAnalyticsMessage, processEmailMessage } from "./queues/handlers";

// Route modules
import { health } from "./routes/health";
import { categories } from "./routes/categories";
import { events } from "./routes/events";
import { search } from "./routes/search";
import { ai } from "./routes/ai";
import { auth } from "./routes/auth";
import { users } from "./routes/users";
import { registrations } from "./routes/registrations";
import { media } from "./routes/media";
import { referrals } from "./routes/referrals";
import { reviews } from "./routes/reviews";
import { stats } from "./routes/stats";
import { admin } from "./routes/admin";
import { seed } from "./routes/seed";
import { series } from "./routes/series";
import { waitlist } from "./routes/waitlist";
import { checkin } from "./routes/checkin";
import { payments } from "./routes/payments";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Global CORS middleware — restrict to trusted origins
app.use("*", cors({
  origin: (origin, c) => {
    if (!origin) return origin;
    // Allow localhost in development
    if (origin.startsWith("http://localhost:")) return origin;
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      const trustedDomains = ["nyuchi.com", "mukoko.com", "nhimbe.com"];
      if (trustedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return origin;
      }
    } catch { /* invalid origin */ }
    // Check ALLOWED_ORIGINS env var
    const env = c.env as Env;
    const extraOrigins = (env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
    if (extraOrigins.some(allowed => origin === allowed.trim())) {
      return origin;
    }
    return null; // Deny unknown origins
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

// Observability
app.use("*", requestIdMiddleware);
app.use("*", requestLogger);

// Rate limit sensitive endpoints
app.use("/api/assistant/*", rateLimit);
app.use("/api/ai/*", rateLimit);
app.use("/api/auth/*", rateLimit);
app.use("/api/search", rateLimit);
app.use("/api/users/*", rateLimit);
app.use("/api/reviews/*", rateLimit);
app.use("/api/referrals/*", rateLimit);
app.use("/api/media/*", rateLimit);
app.use("/api/payments/*", rateLimit);

// Mount route modules
app.route("/", health);
app.route("/api", categories);
app.route("/api/events", events);
app.route("/api", search);
app.route("/api", ai);
app.route("/api/auth", auth);
app.route("/api/users", users);
app.route("/api/registrations", registrations);
app.route("/api/media", media);
app.route("/api/referrals", referrals);
app.route("/api/reviews", reviews);
app.route("/api/community", stats);
app.route("/api/admin", admin);
app.route("/api/series", series);
app.route("/api", seed);
app.route("/api", waitlist);
app.route("/api", checkin);
app.route("/api/payments", payments);

// Global error handler
app.onError((err, c) => {
  const reqId = c.get("requestId");
  console.error(JSON.stringify({
    level: "error",
    requestId: reqId,
    error: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
  }));
  return c.json(
    {
      error: "Internal Server Error",
      requestId: reqId,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Queue handler (not part of Hono — exported alongside)
async function handleQueue(batch: MessageBatch, env: Env): Promise<void> {
  for (const message of batch.messages) {
    try {
      if (batch.queue === "nhimbe-analytics-queue") {
        await processAnalyticsMessage(message.body as AnalyticsQueueMessage, env);
      } else if (batch.queue === "nhimbe-email-queue") {
        await processEmailMessage(message.body as EmailQueueMessage, env);
      }
      message.ack();
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      message.retry();
    }
  }
}

const worker = {
  fetch: app.fetch,
  queue: handleQueue,
};

export default worker;
