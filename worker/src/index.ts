/**
 * nhimbe API - Cloudflare Workers (Hono)
 * Events platform with AI-powered search and recommendations
 * Part of the Mukoko ecosystem
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, AnalyticsQueueMessage, EmailQueueMessage } from "./types";

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

async function processAnalyticsMessage(message: AnalyticsQueueMessage, env: Env): Promise<void> {
  console.log(`Processing analytics message: ${message.type} for event ${message.eventId}`);

  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: [message.type, message.eventId, message.userId || "anonymous"],
      doubles: [Date.now()],
      indexes: [message.type],
    });
  }

  switch (message.type) {
    case "view":
      await env.DB.prepare(
        `UPDATE events SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`
      ).bind(message.eventId).run();
      break;
    case "rsvp":
      break;
    case "referral":
      break;
    case "review":
      break;
  }
}

async function processEmailMessage(message: EmailQueueMessage, env: Env): Promise<void> {
  console.log(`Processing email message: ${message.type} to ${message.to}`);
  // TODO: Integrate with email service (e.g., Resend, SendGrid, Mailgun)
}

export default {
  fetch: app.fetch,
  queue: handleQueue,
};
