/**
 * nhimbe Container App — Hono
 *
 * Handles all CRUD / DB-only routes, proxied from the Cloudflare Worker.
 * The worker retains AI, Vectorize, R2, Images, Queue, and session revocation.
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { AppVariables } from "./types.js";
import { createD1Client } from "./db.js";
import { getMongoDb } from "./mongodb.js";
import { corsMiddleware } from "./middleware/cors.js";

// Route modules
import events from "./routes/events.js";
import registrations from "./routes/registrations.js";
import reviewsRouter from "./routes/reviews.js";
import referralsRouter from "./routes/referrals.js";
import users from "./routes/users.js";
import community from "./routes/community.js";
import categoriesRouter from "./routes/categories.js";
import citiesRouter from "./routes/cities.js";
import admin from "./routes/admin.js";
import auth from "./routes/auth.js";

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware: CORS
app.use("*", corsMiddleware());

// Global middleware: inject database clients
app.use("*", async (c, next) => {
  const db = createD1Client();
  const mongodb = await getMongoDb();
  c.set("db", db);
  c.set("mongodb", mongodb);
  await next();
});

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", service: "mukoko-nhimbe-container", timestamp: new Date().toISOString() })
);

// ── Auth routes (some are public, some need session) ──
app.route("/api/auth", auth);

// ── Public read routes ──
app.route("/api/events", events);
app.route("/api/registrations", registrations);
app.route("/api/users", users);
app.route("/api/categories", categoriesRouter);
app.route("/api/cities", citiesRouter);
app.route("/api/community", community);

// Reviews & referrals (mounted at root since they have mixed path prefixes)
app.route("/api", reviewsRouter);
app.route("/api", referralsRouter);

// ── Admin routes (auth + role checks inside) ──
app.route("/api/admin", admin);

// 404 fallback
app.notFound((c) => c.json({ error: "Not Found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Container error:", err);
  const isDev = process.env.ENVIRONMENT === "development";
  return c.json(
    {
      error: "Internal Server Error",
      ...(isDev && { message: err.message }),
    },
    500
  );
});

// Start server
const port = parseInt(process.env.PORT || "8080", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`nhimbe container running on port ${info.port}`);
});

export default app;
