/**
 * nhimbe API - Cloudflare Workers (Hono)
 * Events platform with AI-powered search and recommendations
 * Part of the Mukoko ecosystem
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AnalyticsQueueMessage, EmailQueueMessage } from "./types";
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

const app = new Hono<{ Bindings: Env }>();

// Global CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

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
app.route("/api", seed);

// Global error handler
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Unknown error",
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
