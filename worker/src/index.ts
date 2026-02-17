/**
 * nhimbe API - Cloudflare Workers
 * Events platform with AI-powered search and recommendations
 * Part of the Mukoko ecosystem
 */

import type {
  Env,
  Event,
  SearchQuery,
  AssistantRequest,
  EventReview,
  ReviewStats,
  ReferralLeaderboardEntry,
  HostStats,
  EventStats,
  CommunityStats,
  AnalyticsQueueMessage,
  EmailQueueMessage,
  UserRole,
} from "./types";
import { hasPermission } from "./types";
import { searchEvents, findSimilarEvents, getRecommendations } from "./ai/search";
import { chat, generateSuggestions } from "./ai/assistant";
import { indexEvent, indexEvents, removeEventFromIndex } from "./ai/embeddings";
import { generateDescription, regenerateDescription, getWizardSteps, type DescriptionContext } from "./ai/description-generator";
<<<<<<< Updated upstream
import { getAuthenticatedUser } from "./auth/stytch";
=======
import { getAuthenticatedUser, revokeSession, extractSessionToken } from "./auth/stytch";
>>>>>>> Stashed changes

const VERSION = "0.2.0";

// ============================================
// Input Validation Helpers
// ============================================

// Safe integer parsing with bounds
function safeParseInt(value: string | null, defaultValue: number, min: number = 0, max: number = 1000): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

// Validate required string fields
function validateRequiredFields(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && !(obj[field] as string).trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Safe JSON parse with error handling
function safeParseJSON(value: string | null, defaultValue: unknown = []): unknown {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://nhimbe.com",
  "https://www.nhimbe.com",
];

// Get CORS headers with dynamic origin
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = env.ALLOWED_ORIGIN
    ? [...ALLOWED_ORIGINS, env.ALLOWED_ORIGIN]
    : ALLOWED_ORIGINS;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Validate API key from request
function validateApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");
  return apiKey === env.API_KEY;
}

<<<<<<< Updated upstream
// Trusted domains — always allow these and all their subdomains
const TRUSTED_DOMAINS = ["nyuchi.com", "mukoko.com", "nhimbe.com"];

// Check if request is from allowed origin (frontend)
function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return false;

  // Always allow localhost in development
  if (origin.startsWith("http://localhost:")) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    // Allow trusted domains and all their subdomains
    if (TRUSTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }
  } catch {
    // Invalid origin URL
  }

  // Also check ALLOWED_ORIGINS env var for any additional origins
  const extraOrigins = (env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  return extraOrigins.some(allowed => origin === allowed.trim());
=======
// Check if request is from allowed origin (frontend) — exact match only
function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = env.ALLOWED_ORIGIN
    ? [...ALLOWED_ORIGINS, env.ALLOWED_ORIGIN]
    : ALLOWED_ORIGINS;
  return allowedOrigins.includes(origin);
}

// Request-scoped CORS headers (set at start of each request)
let corsHeaders: Record<string, string> = {};

// ============================================
// Container Proxy
// Routes that should be forwarded to the Hono container
// ============================================

const CONTAINER_ROUTES = [
  "/api/auth/me",
  "/api/auth/onboarding",
  "/api/auth/token",
  "/api/categories",
  "/api/cities",
  "/api/community/",
  "/api/registrations",
  "/api/referrals/",
  "/api/admin/stats",
  "/api/admin/users",
  "/api/admin/events",
  "/api/admin/support",
];

// Patterns that need post-processing (Vectorize indexing after DB write)
const CONTAINER_WITH_VECTORIZE = [
  { pattern: /^\/api\/events$/, methods: ["POST"] },
  { pattern: /^\/api\/events\/[^/]+$/, methods: ["PUT", "DELETE"] },
  { pattern: /^\/api\/admin\/events\/[^/]+$/, methods: ["DELETE"] },
];

function shouldProxyToContainer(pathname: string, method: string): boolean {
  // Static prefix matches
  if (CONTAINER_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }

  // Event CRUD reads go to container
  if (pathname === "/api/events" && method === "GET") return true;
  if (pathname === "/api/events/trending" && method === "GET") return true;
  if (/^\/api\/events\/[^/]+$/.test(pathname) && method === "GET") return true;
  if (/^\/api\/events\/[^/]+\/view$/.test(pathname) && method === "POST") return true;
  if (/^\/api\/events\/[^/]+\/reviews$/.test(pathname)) return true;
  if (/^\/api\/events\/[^/]+\/stats$/.test(pathname) && method === "GET") return true;
  if (/^\/api\/events\/[^/]+\/referrals$/.test(pathname) && method === "GET") return true;
  if (/^\/api\/reviews\/[^/]+\/helpful$/.test(pathname) && method === "POST") return true;
  if (/^\/api\/users\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/users\/[^/]+\/referral-code$/.test(pathname)) return true;
  if (/^\/api\/users\/[^/]+\/reputation$/.test(pathname) && method === "GET") return true;

  // Event writes go to container + Vectorize post-processing
  if (CONTAINER_WITH_VECTORIZE.some(r => r.pattern.test(pathname) && r.methods.includes(method))) {
    return true;
  }

  return false;
}

function needsVectorizePostProcessing(pathname: string, method: string): boolean {
  return CONTAINER_WITH_VECTORIZE.some(r => r.pattern.test(pathname) && r.methods.includes(method));
}

async function proxyToContainer(request: Request, env: Env, url: URL): Promise<Response> {
  // If container binding not available, fall through to local handlers
  if (!env.CONTAINER) {
    return new Response(null, { status: 0 }); // Sentinel: not proxied
  }

  const containerResponse = await env.CONTAINER.fetch(request);

  // If the route needs Vectorize post-processing, handle it
  if (needsVectorizePostProcessing(url.pathname, request.method) && containerResponse.ok) {
    try {
      const body = await containerResponse.clone().json() as Record<string, unknown>;

      // Event create/update: re-index in Vectorize
      if (body.event && (request.method === "POST" || request.method === "PUT")) {
        const event = body.event as Event;
        await indexEvent(env.AI, env.VECTORIZE, event);
      }

      // Event delete: remove from Vectorize
      if (body._vectorizeRemove) {
        await removeEventFromIndex(env.VECTORIZE, body._vectorizeRemove as string);
      }
    } catch (error) {
      console.error("Vectorize post-processing error:", error);
      // Don't fail the response — DB write succeeded
    }
  }

  return containerResponse;
>>>>>>> Stashed changes
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    corsHeaders = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Root endpoint - Status Page
      if (url.pathname === "/") {
        const accept = request.headers.get("Accept") || "";
        if (accept.includes("application/json")) {
          return jsonResponse({
            name: "nhimbe API",
            version: VERSION,
            status: "healthy",
            environment: env.ENVIRONMENT,
            features: ["events", "search", "ai-assistant", "recommendations"],
          });
        }
        return statusPage(env);
      }

      // Health check (JSON only)
      if (url.pathname === "/api/health") {
        return jsonResponse({
          status: "ok",
          timestamp: new Date().toISOString(),
          services: {
            ai: !!env.AI,
            vectorize: !!env.VECTORIZE,
            database: !!env.DB,
            cache: !!env.CACHE,
          },
        });
      }

      // ── Proxy to container for CRUD routes ──
      if (shouldProxyToContainer(url.pathname, request.method)) {
        const containerResponse = await proxyToContainer(request, env, url);
        if (containerResponse.status !== 0) {
          return containerResponse;
        }
        // Fall through to local handlers if container unavailable
      }

      // Event view tracking (before general events handler)
      const viewMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/view$/);
      if (viewMatch && request.method === "POST") {
        return handleEventView(viewMatch[1], request, env);
      }

      // Events endpoints
      if (url.pathname.startsWith("/api/events")) {
        // Write operations require API key or allowed origin
        if (["POST", "PUT", "DELETE"].includes(request.method)) {
          if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
        }
        return handleEvents(request, url, env);
      }

      // AI Search endpoint (origin-restricted — consumes Workers AI credits)
      if (url.pathname === "/api/search") {
        if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        return handleSearch(request, env);
      }

      // AI Assistant endpoint (origin-restricted)
      if (url.pathname === "/api/assistant") {
        if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        return handleAssistant(request, env);
      }

      // AI Description Generator endpoints (origin-restricted)
      if (url.pathname === "/api/ai/description/wizard-steps") {
        return handleDescriptionWizardSteps(request);
      }
      if (url.pathname === "/api/ai/description/generate") {
        if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        return handleGenerateDescription(request, env);
      }
      if (url.pathname === "/api/ai/description/regenerate") {
        if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        return handleRegenerateDescription(request, env);
      }

      // Auth endpoints
      if (url.pathname === "/api/auth/sync") {
        return handleAuthSync(request, env);
      }
      if (url.pathname === "/api/auth/me") {
        return handleAuthMe(request, env);
      }
      if (url.pathname === "/api/auth/onboarding") {
        return handleAuthOnboarding(request, env);
      }
<<<<<<< Updated upstream
      // Logout is handled by the Stytch frontend SDK — no backend route needed.
=======
      if (url.pathname === "/api/auth/logout") {
        return handleAuthLogout(request, env);
      }
>>>>>>> Stashed changes

      // Recommendations endpoint
      if (url.pathname === "/api/recommendations") {
        return handleRecommendations(request, url, env);
      }

      // Similar events endpoint
      if (url.pathname.startsWith("/api/similar/")) {
        return handleSimilarEvents(url, env);
      }

      // Admin: Index events (API key required)
      if (url.pathname === "/api/admin/index-events") {
        if (!validateApiKey(request, env)) {
          return jsonResponse({ error: "Unauthorized - API key required" }, 401);
        }
        return handleIndexEvents(request, env);
      }

      // Users endpoints
      if (url.pathname.startsWith("/api/users")) {
        return handleUsers(request, url, env);
      }

      // Registrations endpoints (require auth for write)
      if (url.pathname.startsWith("/api/registrations")) {
        if (["POST", "PUT", "DELETE"].includes(request.method)) {
          if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
        }
        return handleRegistrations(request, url, env);
      }

      // Media endpoints (require auth for upload/delete)
      if (url.pathname.startsWith("/api/media")) {
        if (["POST", "DELETE"].includes(request.method)) {
          if (!validateApiKey(request, env) && !isAllowedOrigin(request, env)) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
        }
        return handleMedia(request, url, env);
      }

      // Categories endpoint
      if (url.pathname === "/api/categories") {
        return handleCategories();
      }

      // Cities endpoint
      if (url.pathname === "/api/cities") {
        return handleCities();
      }

      // Admin: Seed sample data (API key required)
      if (url.pathname === "/api/admin/seed") {
        if (!validateApiKey(request, env)) {
          return jsonResponse({ error: "Unauthorized - API key required" }, 401);
        }
        return handleSeedData(request, env);
      }

      // ============================================
      // OPEN DATA ENDPOINTS - Reviews, Referrals, Stats
      // ============================================

      // Event Reviews - GET /api/events/:id/reviews, POST /api/events/:id/reviews
      const reviewsMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/reviews$/);
      if (reviewsMatch) {
        return handleEventReviews(reviewsMatch[1], request, env);
      }

      // Review helpful vote - POST /api/reviews/:id/helpful
      const helpfulMatch = url.pathname.match(/^\/api\/reviews\/([^/]+)\/helpful$/);
      if (helpfulMatch && request.method === "POST") {
        return handleReviewHelpful(helpfulMatch[1], request, env);
      }

      // Event Stats - GET /api/events/:id/stats
      const statsMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/stats$/);
      if (statsMatch && request.method === "GET") {
        return handleEventStats(statsMatch[1], env);
      }

      // Event Referrals Leaderboard - GET /api/events/:id/referrals
      const referralsMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/referrals$/);
      if (referralsMatch && request.method === "GET") {
        return handleEventReferrals(referralsMatch[1], env);
      }

      // Track referral - POST /api/referrals/track
      if (url.pathname === "/api/referrals/track" && request.method === "POST") {
        return handleTrackReferral(request, env);
      }

      // User referral code - GET/POST /api/users/:id/referral-code
      const userRefCodeMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/referral-code$/);
      if (userRefCodeMatch) {
        return handleUserReferralCode(userRefCodeMatch[1], request, env);
      }

      // Host Reputation - GET /api/users/:id/reputation
      const reputationMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/reputation$/);
      if (reputationMatch && request.method === "GET") {
        return handleHostReputation(reputationMatch[1], env);
      }

      // Community Stats - GET /api/community/stats
      if (url.pathname === "/api/community/stats" && request.method === "GET") {
        return handleCommunityStats(url, env);
      }

      // Trending Events - GET /api/events/trending
      if (url.pathname === "/api/events/trending" && request.method === "GET") {
        return handleTrendingEvents(url, env);
      }

      // ============================================
      // ADMIN DASHBOARD ENDPOINTS (Role-based access)
      // ============================================

      // Admin Stats - GET /api/admin/stats
      if (url.pathname === "/api/admin/stats" && request.method === "GET") {
        return handleAdminStats(request, env);
      }

      // Admin Users - GET /api/admin/users
      if (url.pathname === "/api/admin/users" && request.method === "GET") {
        return handleAdminUsers(request, url, env);
      }

      // Admin User Actions - suspend/activate/role
      const adminUserActionMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/(suspend|activate|role)$/);
      if (adminUserActionMatch && request.method === "POST") {
        return handleAdminUserAction(adminUserActionMatch[1], adminUserActionMatch[2], request, env);
      }

      // Admin Events - GET /api/admin/events
      if (url.pathname === "/api/admin/events" && request.method === "GET") {
        return handleAdminEvents(request, url, env);
      }

      // Admin Delete Event - DELETE /api/admin/events/:id
      const adminEventDeleteMatch = url.pathname.match(/^\/api\/admin\/events\/([^/]+)$/);
      if (adminEventDeleteMatch && request.method === "DELETE") {
        return handleAdminDeleteEvent(adminEventDeleteMatch[1], request, env);
      }

      // Admin Support Tickets - GET /api/admin/support
      if (url.pathname === "/api/admin/support" && request.method === "GET") {
        return handleAdminSupport(request, url, env);
      }

      // Admin Support Ticket Status - PUT /api/admin/support/:id/status
      const adminTicketStatusMatch = url.pathname.match(/^\/api\/admin\/support\/([^/]+)\/status$/);
      if (adminTicketStatusMatch && request.method === "PUT") {
        return handleAdminTicketStatus(adminTicketStatusMatch[1], request, env);
      }

      // Admin Support Ticket Reply - POST /api/admin/support/:id/reply
      const adminTicketReplyMatch = url.pathname.match(/^\/api\/admin\/support\/([^/]+)\/reply$/);
      if (adminTicketReplyMatch && request.method === "POST") {
        return handleAdminTicketReply(adminTicketReplyMatch[1], request, env);
      }

      // 404 for unknown routes
      return jsonResponse({ error: "Not Found" }, 404);
    } catch (error) {
      console.error("API Error:", error);
      const isDev = env.ENVIRONMENT === "development";
      return jsonResponse(
        {
          error: "Internal Server Error",
          ...(isDev && { message: error instanceof Error ? error.message : "Unknown error" }),
        },
        500
      );
    }
  },

  async queue(batch, env): Promise<void> {
    // Process messages based on queue
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
  },
};

export default worker;

// ============================================
// Queue Message Processors
// ============================================

async function processAnalyticsMessage(message: AnalyticsQueueMessage, env: Env): Promise<void> {
  console.log(`Processing analytics message: ${message.type} for event ${message.eventId}`);

  // Write to Analytics Engine for real-time analytics
  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: [message.type, message.eventId, message.userId || "anonymous"],
      doubles: [Date.now()],
      indexes: [message.type],
    });
  }

  // Update aggregated stats in D1 based on message type
  switch (message.type) {
    case "view":
      await env.DB.prepare(
        `UPDATE events SET view_count = COALESCE(view_count, 0) + 1 WHERE _id = ?`
      ).bind(message.eventId).run();
      break;
    case "rsvp":
      // RSVP counts are updated when registration is created
      break;
    case "referral":
      // Referral tracking handled by referral endpoints
      break;
    case "review":
      // Review stats updated when review is created
      break;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function processEmailMessage(message: EmailQueueMessage, env: Env): Promise<void> {
  console.log(`Processing email message: ${message.type} to ${message.to}`);

  // TODO: Integrate with email service (e.g., Resend, SendGrid, Mailgun)
  // For now, just log the email details
  // In production, this would call the email provider's API

  // Example structure for future implementation:
  // await sendEmail({
  //   to: message.to,
  //   subject: message.subject,
  //   template: message.type,
  //   data: message.templateData,
  // });
}

// ============================================
// Status Page
// ============================================

function statusPage(env: Env): Response {
  const services = [
    { name: "Workers AI", status: !!env.AI, description: "LLM & Embeddings" },
    { name: "Vectorize", status: !!env.VECTORIZE, description: "Vector Search" },
    { name: "D1 Database", status: !!env.DB, description: "SQLite Storage" },
    { name: "KV Cache", status: !!env.CACHE, description: "Edge Caching" },
    { name: "R2 Storage", status: !!env.MEDIA, description: "Media Files" },
    { name: "Images", status: !!env.IMAGES, description: "Image Processing" },
  ];

  const allHealthy = services.every(s => s.status);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nhimbe API - Mukoko Ecosystem</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --background: #0A0A0A;
      --surface: #141414;
      --elevated: #1E1E1E;
      --foreground: #F5F5F4;
      --text-secondary: #A8A8A3;
      --text-tertiary: #6B6B66;
      --malachite: #64FFDA;
      --tanzanite: #B388FF;
      --gold: #FFD740;
      --success: #4ADE80;
      --error: #F87171;
      --radius: 12px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: var(--background);
      color: var(--foreground);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    header {
      text-align: center;
      margin-bottom: 48px;
    }

    .logo {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--malachite);
      margin-bottom: 8px;
    }

    .tagline {
      font-family: 'Noto Serif', serif;
      font-style: italic;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .version {
      display: inline-block;
      background: var(--surface);
      border: 1px solid var(--elevated);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--elevated);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 24px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .card-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--malachite), var(--tanzanite));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .service {
      background: var(--elevated);
      border-radius: 8px;
      padding: 16px;
    }

    .service-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .service-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-dot.online {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .status-dot.offline {
      background: var(--error);
      box-shadow: 0 0 8px var(--error);
    }

    .service-desc {
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .endpoint {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--elevated);
      border-radius: 8px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 0.85rem;
    }

    .method {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      min-width: 60px;
      text-align: center;
    }

    .method.get { background: rgba(100, 255, 218, 0.2); color: var(--malachite); }
    .method.post { background: rgba(179, 136, 255, 0.2); color: var(--tanzanite); }
    .method.put { background: rgba(255, 215, 64, 0.2); color: var(--gold); }
    .method.delete { background: rgba(248, 113, 113, 0.2); color: var(--error); }

    .path {
      flex: 1;
      color: var(--foreground);
    }

    .endpoint-desc {
      color: var(--text-tertiary);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.8rem;
    }

    footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid var(--elevated);
      margin-top: 48px;
    }

    .mukoko-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .mukoko-badge a {
      color: var(--tanzanite);
      text-decoration: none;
      font-weight: 600;
    }

    .mukoko-badge a:hover {
      text-decoration: underline;
    }

    .copyright {
      margin-top: 12px;
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    @media (max-width: 640px) {
      .endpoint {
        flex-wrap: wrap;
      }
      .endpoint-desc {
        width: 100%;
        margin-top: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">nhimbe</div>
      <p class="tagline">"Together we gather, together we grow"</p>
      <span class="version">API v${VERSION} • ${env.ENVIRONMENT}</span>
    </header>

    <div class="card">
      <div class="card-header">
        <div class="card-icon">⚡</div>
        <h2 class="card-title">Service Status</h2>
      </div>
      <div class="services-grid">
        ${services
          .map(
            (s) => `
          <div class="service">
            <div class="service-header">
              <span class="service-name">${s.name}</span>
              <span class="status-dot ${s.status ? "online" : "offline"}"></span>
            </div>
            <span class="service-desc">${s.description}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="card" style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 16px;">${allHealthy ? "✅" : "⚠️"}</div>
      <h2 style="font-size: 1.5rem; margin-bottom: 8px;">${allHealthy ? "All Systems Operational" : "Degraded Performance"}</h2>
      <p style="color: var(--text-secondary);">
        API documentation available to authorized clients only.
      </p>
    </div>

    <footer>
      <div class="mukoko-badge">
        A <a href="https://mukoko.com">Mukoko</a> Product
      </div>
      <p class="copyright">© ${new Date().getFullYear()} Nyuchi Africa. All rights reserved.</p>
    </footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}

// ============================================
// Events Handlers
// ============================================

async function handleEvents(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const method = request.method;

  // GET /api/events - List all events
  if (url.pathname === "/api/events" && method === "GET") {
    const city = url.searchParams.get("city");
    const category = url.searchParams.get("category");
    // Use safe parsing with bounds (min: 1, max: 100 for limit; max: 10000 for offset)
    const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
    const offset = safeParseInt(url.searchParams.get("offset"), 0, 0, 10000);

    let query = "SELECT * FROM events WHERE is_published = TRUE AND event_status = 'EventScheduled'";
    const params: unknown[] = [];

    if (city) {
      query += " AND location_locality = ?";
      params.push(city);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    query += " ORDER BY start_date ASC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...params).all();
    const events = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));

    return jsonResponse({
      events,
      pagination: { limit, offset, total: events.length },
    });
  }

  // GET /api/events/:id - Get single event
  const eventIdMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventIdMatch && method === "GET") {
    const eventId = eventIdMatch[1];

    const result = await env.DB.prepare("SELECT * FROM events WHERE _id = ? OR slug = ? OR short_code = ?")
      .bind(eventId, eventId, eventId)
      .first();

    if (!result) {
      return jsonResponse({ error: "Event not found" }, 404);
    }

    return jsonResponse({ event: dbRowToEvent(result as Record<string, unknown>) });
  }

  // POST /api/events - Create event
  if (url.pathname === "/api/events" && method === "POST") {
    const body = await request.json() as Record<string, unknown>;

    // Generate IDs
    const id = (body._id as string) || generateId();
    const shortCode = (body.shortCode as string) || generateShortCode();
    const slug = (body.slug as string) || slugify((body.name as string) || "");

    // Extract location fields for D1 columns
    const location = body.location as Record<string, unknown> | undefined;
    const isPlace = location?.["@type"] === "Place";
    const address = isPlace ? (location?.address as Record<string, unknown>) : undefined;
    const organizer = body.organizer as Record<string, unknown> | undefined;
    const offers = body.offers as Record<string, unknown> | undefined;
    const dateDisplay = body.dateDisplay as Record<string, unknown> | undefined;
    const isOnline = !isPlace;

    // Insert into database (schema.org-aligned D1 column names)
    await env.DB.prepare(`
      INSERT INTO events (
        _id, short_code, slug, name, description,
        date_display_day, date_display_month, date_display_full, date_display_time, start_date,
        location_name, location_street_address, location_locality, location_country,
        category, keywords, image, cover_gradient,
        attendee_count, maximum_attendee_capacity, event_attendance_mode, meeting_url, meeting_platform,
        organizer_name, organizer_alternate_name, organizer_initials, organizer_event_count,
        offer_url,
        offer_price, offer_price_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      shortCode,
      slug,
      body.name,
      body.description,
      dateDisplay?.day,
      dateDisplay?.month,
      dateDisplay?.full,
      dateDisplay?.time,
      body.startDate,
      isPlace ? location?.name : null,
      isPlace ? address?.streetAddress : null,
      isPlace ? address?.addressLocality : null,
      isPlace ? address?.addressCountry : null,
      body.category,
      JSON.stringify(body.keywords || []),
      body.image,
      body.coverGradient,
      (body.attendeeCount as number) || 0,
      body.maximumAttendeeCapacity,
      isOnline ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode",
      body.meetingUrl || (isOnline && location ? (location as Record<string, unknown>).url : null),
      body.meetingPlatform,
      organizer?.name,
      organizer?.alternateName,
      organizer?.initials,
      (organizer?.eventCount as number) || 0,
      offers?.url || null,
      offers?.price,
      offers?.priceCurrency
    ).run();

    // Build Event object for Vectorize indexing
    const event: Event = {
      _id: id,
      name: (body.name as string) || "",
      description: (body.description as string) || "",
      startDate: (body.startDate as string) || "",
      eventAttendanceMode: isOnline ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode",
      eventStatus: "EventScheduled",
      image: body.image as string | undefined,
      keywords: (body.keywords as string[]) || [],
      maximumAttendeeCapacity: body.maximumAttendeeCapacity as number | undefined,
      location: isOnline
        ? { "@type": "VirtualLocation" as const, url: ((location as Record<string, unknown>)?.url as string) || "" }
        : {
            "@type": "Place" as const,
            name: (location?.name as string) || "",
            address: {
              "@type": "PostalAddress" as const,
              streetAddress: (address?.streetAddress as string) || "",
              addressLocality: (address?.addressLocality as string) || "",
              addressCountry: (address?.addressCountry as string) || "",
            },
          },
      organizer: {
        "@type": "Person" as const,
        name: (organizer?.name as string) || "",
        alternateName: organizer?.alternateName as string | undefined,
        initials: organizer?.initials as string | undefined,
        eventCount: (organizer?.eventCount as number) || 0,
      },
      offers: offers
        ? {
            "@type": "Offer" as const,
            price: (offers.price as number) || 0,
            priceCurrency: (offers.priceCurrency as string) || "USD",
            availability: "InStock",
            url: offers.url as string | undefined,
          }
        : undefined,
      shortCode,
      slug,
      category: (body.category as string) || "",
      attendeeCount: (body.attendeeCount as number) || 0,
      coverGradient: body.coverGradient as string | undefined,
      meetingUrl: body.meetingUrl as string | undefined,
      meetingPlatform: body.meetingPlatform as "zoom" | "google_meet" | "teams" | "other" | undefined,
      dateDisplay: {
        day: (dateDisplay?.day as string) || "",
        month: (dateDisplay?.month as string) || "",
        full: (dateDisplay?.full as string) || "",
        time: (dateDisplay?.time as string) || "",
      },
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };

    await indexEvent(env.AI, env.VECTORIZE, event);

    return jsonResponse({ event, message: "Event created successfully" }, 201);
  }

  // PUT /api/events/:id - Update event
  if (eventIdMatch && method === "PUT") {
    const eventId = eventIdMatch[1];
    const body = await request.json() as Partial<Event>;

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.name) { updates.push("name = ?"); params.push(body.name); }
    if (body.description) { updates.push("description = ?"); params.push(body.description); }
    if (body.category) { updates.push("category = ?"); params.push(body.category); }
    if (body.keywords) { updates.push("keywords = ?"); params.push(JSON.stringify(body.keywords)); }
    // Add more fields as needed...

    updates.push("date_modified = datetime('now')");
    params.push(eventId);

    await env.DB.prepare(
      `UPDATE events SET ${updates.join(", ")} WHERE _id = ?`
    ).bind(...params).run();

    // Re-index in Vectorize
    const result = await env.DB.prepare("SELECT * FROM events WHERE _id = ?")
      .bind(eventId)
      .first();

    if (result) {
      await indexEvent(env.AI, env.VECTORIZE, dbRowToEvent(result as Record<string, unknown>));
    }

    return jsonResponse({ message: "Event updated successfully" });
  }

  // DELETE /api/events/:id - Delete event
  if (eventIdMatch && method === "DELETE") {
    const eventId = eventIdMatch[1];

    await env.DB.prepare("DELETE FROM events WHERE _id = ?").bind(eventId).run();
    await removeEventFromIndex(env.VECTORIZE, eventId);

    return jsonResponse({ message: "Event deleted successfully" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

// ============================================
// AI Search Handler
// ============================================

async function handleSearch(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json() as SearchQuery;

  if (!body.query) {
    return jsonResponse({ error: "Query is required" }, 400);
  }

  const result = await searchEvents(env.AI, env.VECTORIZE, env.DB, body);

  // Log search query for analytics
  await env.DB.prepare(
    "INSERT INTO search_queries (query, results_count) VALUES (?, ?)"
  ).bind(body.query, result.totalResults).run();

  return jsonResponse(result);
}

// ============================================
// AI Assistant Handler
// ============================================

async function handleAssistant(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json() as AssistantRequest;

  if (!body.message) {
    return jsonResponse({ error: "Message is required" }, 400);
  }

  const response = await chat(env.AI, env.VECTORIZE, env.DB, body);

  return jsonResponse(response);
}

// ============================================
// AI Description Generator Handlers
// ============================================

async function handleDescriptionWizardSteps(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let category: string | undefined;
  if (request.method === "POST") {
    const body = await request.json() as { category?: string };
    category = body.category;
  }

  const steps = getWizardSteps(category);
  return jsonResponse({ steps });
}

async function handleGenerateDescription(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json() as DescriptionContext;

  if (!body.eventType && !body.targetAudience && !body.keyTakeaways) {
    return jsonResponse({ error: "Please provide at least one detail about your event" }, 400);
  }

  const result = await generateDescription(env.AI, body);
  return jsonResponse(result);
}

async function handleRegenerateDescription(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json() as DescriptionContext & { feedback: string };

  if (!body.feedback) {
    return jsonResponse({ error: "Feedback is required for regeneration" }, 400);
  }

  const result = await regenerateDescription(env.AI, body, body.feedback);
  return jsonResponse(result);
}

// ============================================
// Recommendations Handler
// ============================================

async function handleRecommendations(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  if (request.method === "GET") {
    const city = url.searchParams.get("city") || undefined;
    const interests = url.searchParams.get("interests")?.split(",") || [];

    const suggestions = await generateSuggestions(env.AI, env.VECTORIZE, env.DB, {
      city,
      interests,
    });

    return jsonResponse(suggestions);
  }

  if (request.method === "POST") {
    const body = await request.json() as { city?: string; interests?: string[] };

    const events = await getRecommendations(
      env.AI,
      env.VECTORIZE,
      env.DB,
      body.interests || [],
      body.city
    );

    return jsonResponse({ events });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ============================================
// Event View Tracking Handler
// ============================================

async function handleEventView(
  eventId: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as { user_id?: string; source?: string };

    await env.DB.prepare(
      "INSERT INTO event_views (event_id, user_id, source) VALUES (?, ?, ?)"
    ).bind(eventId, body.user_id || null, body.source || "web").run();

    return jsonResponse({ message: "View tracked" });
  } catch (error) {
    console.error("Failed to track view:", error);
    return jsonResponse({ message: "View tracking failed" }, 500);
  }
}

// ============================================
// Similar Events Handler
// ============================================

async function handleSimilarEvents(url: URL, env: Env): Promise<Response> {
  const eventId = url.pathname.split("/").pop();

  if (!eventId) {
    return jsonResponse({ error: "Event ID required" }, 400);
  }

  const events = await findSimilarEvents(env.AI, env.VECTORIZE, env.DB, eventId);

  return jsonResponse({ events });
}

// ============================================
// Admin: Index Events Handler
// ============================================

async function handleIndexEvents(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Get all events from database
  const result = await env.DB.prepare(
    "SELECT * FROM events WHERE is_published = TRUE"
  ).all();

  const events = result.results.map((row) => dbRowToEvent(row as Record<string, unknown>));

  // Index all events in Vectorize
  const indexResult = await indexEvents(env.AI, env.VECTORIZE, events);

  return jsonResponse({
    message: "Indexing complete",
    indexed: indexResult.indexed,
    errors: indexResult.errors,
  });
}

// ============================================
// Users Handler
// ============================================

async function handleUsers(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const method = request.method;

  // GET /api/users/:id
  const userIdMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userIdMatch && method === "GET") {
    const userId = userIdMatch[1];

    const result = await env.DB.prepare(
      "SELECT * FROM users WHERE _id = ? OR alternate_name = ?"
    ).bind(userId, userId).first();

    if (!result) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    return jsonResponse({ user: result });
  }

  // POST /api/users - Create user
  if (url.pathname === "/api/users" && method === "POST") {
    const body = await request.json() as Record<string, unknown>;
    const id = generateId();

    await env.DB.prepare(`
      INSERT INTO users (_id, email, name, alternate_name, address_locality, address_country, interests)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.email,
      body.name,
      body.handle,
      body.city,
      body.country,
      JSON.stringify(body.interests || [])
    ).run();

    return jsonResponse({ id, message: "User created successfully" }, 201);
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

// ============================================
// Auth Handlers
// ============================================

async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authResult = await getAuthenticatedUser(request, env);
  if (!authResult.user) {
    console.error("Auth failed (me):", authResult.failureReason, authResult.detail);
    return jsonResponse({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  // Look up user in our database by Stytch user ID
  interface DbUserRow {
    _id: string;
    email: string;
    name: string;
    alternate_name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    interests: string | null;
    onboarding_completed: number | null;
    stytch_user_id: string | null;
    role: string | null;
  }
  const result = await env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUserRow | null;

  if (!result) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  const user = {
    id: result._id,
    email: result.email,
    name: result.name,
    handle: result.alternate_name,
    avatarUrl: result.image,
    city: result.address_locality,
    country: result.address_country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: !!(result.onboarding_completed),
    stytchUserId: result.stytch_user_id,
    role: result.role || 'user',
  };

  return jsonResponse({ user });
}

async function handleAuthOnboarding(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authResult = await getAuthenticatedUser(request, env);
  if (!authResult.user) {
    console.error("Auth failed (onboarding):", authResult.failureReason, authResult.detail);
    return jsonResponse({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await request.json() as {
    name: string;
    email: string;
    city: string;
    country: string;
    interests: string[];
  };

  if (!body.name || !body.email || !body.city || !body.country) {
    return jsonResponse({ error: "Name, email, city, and country are required" }, 400);
  }

  // Check if user already exists
  const existingUser = await env.DB.prepare(
<<<<<<< Updated upstream
    "SELECT id FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as { id: string } | null;
=======
    "SELECT _id FROM users WHERE stytch_user_id = ? OR email = ?"
  ).bind(stytchUser.userId, stytchUser.email).first() as { _id: string } | null;
>>>>>>> Stashed changes

  let userId: string;

  if (existingUser) {
    // Update existing user
    userId = existingUser._id;
    await env.DB.prepare(`
      UPDATE users SET
        name = ?,
        stytch_user_id = ?,
        address_locality = ?,
        address_country = ?,
        interests = ?,
        email_verified = 1,
        onboarding_completed = 1,
        last_login_at = datetime('now'),
        date_modified = datetime('now')
      WHERE _id = ?
    `).bind(
      body.name,
      stytchUser.userId,
      body.city,
      body.country,
      JSON.stringify(body.interests || []),
      userId
    ).run();
  } else {
    // Create new user
    userId = generateId();
    const handle = generateHandle(body.name);

    await env.DB.prepare(`
      INSERT INTO users (
        _id, email, name, alternate_name, stytch_user_id,
        address_locality, address_country, interests,
        email_verified, onboarding_completed, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))
    `).bind(
      userId,
      body.email,
      body.name,
      handle,
      stytchUser.userId,
      body.city,
      body.country,
      JSON.stringify(body.interests || [])
    ).run();
  }

  // Fetch the created/updated user
  interface UserRow {
    _id: string;
    email: string;
    name: string;
    alternate_name: string;
    image: string | null;
    address_locality: string;
    address_country: string;
    interests: string;
    stytch_user_id: string;
  }
  const result = await env.DB.prepare(
    "SELECT * FROM users WHERE _id = ?"
  ).bind(userId).first() as UserRow;

  const user = {
    id: result._id,
    email: result.email,
    name: result.name,
    handle: result.alternate_name,
    avatarUrl: result.image,
    city: result.address_locality,
    country: result.address_country,
    interests: safeParseJSON(result.interests, []) as string[],
    onboardingCompleted: true,
    stytchUserId: result.stytch_user_id,
  };

  return jsonResponse({ user, message: "Onboarding completed" }, 201);
}

async function handleAuthSync(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authResult = await getAuthenticatedUser(request, env);
  if (!authResult.user) {
    console.error("Auth failed (sync):", authResult.failureReason, authResult.detail);
    return jsonResponse({ error: "Unauthorized", reason: authResult.failureReason }, 401);
  }
  const stytchUser = authResult.user;

  const body = await request.json() as {
<<<<<<< Updated upstream
    stytch_user_id: string;
    email: string;
    name: string;
  };

  if (!body.stytch_user_id || !body.email) {
    return jsonResponse({ error: "stytch_user_id and email are required" }, 400);
  }

  // Look up user by stytch_user_id or email
=======
    session_token?: string;
    session_jwt?: string;
    stytch_user_id?: string;
    email?: string;
    name?: string;
  };

  const stytchUserId = body.stytch_user_id;
  const email = body.email;
  const name = body.name || email?.split("@")[0] || "User";

  if (!stytchUserId || !email) {
    return jsonResponse({ error: "stytch_user_id and email are required" }, 400);
  }

  // Look up or prepare user data
>>>>>>> Stashed changes
  interface DbUser {
    _id: string;
    email: string;
    name: string | null;
    alternate_name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    interests: string | null;
    onboarding_completed: number | null;
    stytch_user_id: string | null;
    role: string | null;
  }

  const existingUser = await env.DB.prepare(
    "SELECT * FROM users WHERE stytch_user_id = ? OR email = ?"
<<<<<<< Updated upstream
  ).bind(stytchUser.userId, body.email).first() as DbUser | null;

  if (existingUser) {
    // Update last login and ensure stytch_user_id is set
    await env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now'), stytch_user_id = ? WHERE id = ?"
    ).bind(stytchUser.userId, existingUser.id).run();

    const user = {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name || body.name,
      handle: existingUser.handle,
      avatarUrl: existingUser.avatar_url,
      city: existingUser.city,
      country: existingUser.country,
      interests: safeParseJSON(existingUser.interests, []) as string[],
      onboardingCompleted: !!(existingUser.onboarding_completed),
      stytchUserId: stytchUser.userId,
      role: existingUser.role || 'user',
    };

    return jsonResponse({ user });
  }

  // New user — return stub, actual record created during onboarding
  const user = {
    id: null,
    email: body.email,
    name: body.name || "",
    handle: null,
    avatarUrl: null,
    city: null,
    country: null,
    interests: [],
    onboardingCompleted: false,
    stytchUserId: stytchUser.userId,
    role: 'user',
  };

  return jsonResponse({ user });
}

// Logout is handled entirely by the Stytch frontend SDK (session.revoke()).
// No backend endpoint needed.
=======
  ).bind(stytchUserId, email).first() as DbUser | null;

  if (existingUser) {
    // Update last login and stytch_user_id
    await env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now'), stytch_user_id = ? WHERE _id = ?"
    ).bind(stytchUserId, existingUser._id).run();

    user = {
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.name || name,
      handle: existingUser.alternate_name,
      avatarUrl: existingUser.image,
      city: existingUser.address_locality,
      country: existingUser.address_country,
      interests: safeParseJSON(existingUser.interests, []) as string[],
      onboardingCompleted: !!(existingUser.onboarding_completed),
      stytchUserId,
      role: existingUser.role || 'user',
    };
  } else {
    // New user - will need onboarding
    user = {
      id: null,
      email,
      name,
      handle: null,
      avatarUrl: null,
      city: null,
      country: null,
      interests: [],
      onboardingCompleted: false,
      stytchUserId,
      role: 'user',
    };
  }

  return jsonResponse({ user });
}

async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Revoke Stytch session if we have a session token
  const { sessionToken } = extractSessionToken(request);
  if (sessionToken) {
    await revokeSession(sessionToken, env).catch(() => {});
  }

  return jsonResponse({ message: "Logged out successfully" });
}
>>>>>>> Stashed changes

function generateHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `@${base}${suffix}`;
}

// ============================================
// Registrations Handler
// ============================================

async function handleRegistrations(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const method = request.method;

  // GET /api/registrations?event_id=... or ?user_id=...
  if (url.pathname === "/api/registrations" && method === "GET") {
    const eventId = url.searchParams.get("event_id");
    const userId = url.searchParams.get("user_id");

    if (eventId) {
      const result = await env.DB.prepare(
        "SELECT * FROM registrations WHERE event = ?"
      ).bind(eventId).all();
      return jsonResponse({ registrations: result.results });
    }

    if (userId) {
      const result = await env.DB.prepare(
        "SELECT * FROM registrations WHERE agent = ?"
      ).bind(userId).all();
      return jsonResponse({ registrations: result.results });
    }

    return jsonResponse({ error: "event_id or user_id required" }, 400);
  }

  // POST /api/registrations - Register for event
  if (url.pathname === "/api/registrations" && method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['event_id', 'user_id']);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    // Verify event exists and is available for registration
    const event = await env.DB.prepare(
      "SELECT _id, maximum_attendee_capacity, attendee_count, is_published, event_status FROM events WHERE _id = ?"
    ).bind(body.event_id).first() as { _id: string; maximum_attendee_capacity: number | null; attendee_count: number; is_published: boolean; event_status: string } | null;

    if (!event) {
      return jsonResponse({ error: "Event not found" }, 404);
    }

    if (!event.is_published || event.event_status === 'EventCancelled') {
      return jsonResponse({ error: "Event is not available for registration" }, 400);
    }

    // Check capacity
    if (event.maximum_attendee_capacity && event.attendee_count >= event.maximum_attendee_capacity) {
      return jsonResponse({ error: "Event is at capacity" }, 400);
    }

    // Check if user is already registered
    const existingReg = await env.DB.prepare(
      "SELECT _id FROM registrations WHERE event = ? AND agent = ? AND rsvp_response NOT IN ('cancelled', 'rejected')"
    ).bind(body.event_id, body.user_id).first();

    if (existingReg) {
      return jsonResponse({ error: "User is already registered for this event" }, 400);
    }

    const id = generateId();

    await env.DB.prepare(`
      INSERT INTO registrations (_id, event, agent, ticket_type, ticket_price, ticket_currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.event_id,
      body.user_id,
      body.ticket_type || null,
      body.ticket_price || null,
      body.ticket_currency || null
    ).run();

    // Update attendee count
    await env.DB.prepare(
      "UPDATE events SET attendee_count = attendee_count + 1 WHERE _id = ?"
    ).bind(body.event_id).run();

    return jsonResponse({ id, message: "Registration successful" }, 201);
  }

  // PUT /api/registrations/:id - Update registration status (approve/reject)
  const regIdMatch = url.pathname.match(/^\/api\/registrations\/([^/]+)$/);
  if (regIdMatch && method === "PUT") {
    const regId = regIdMatch[1];
    let body: { status: string; user_id?: string };
    try {
      body = await request.json() as { status: string; user_id?: string };
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!body.status || !["approved", "rejected", "pending", "registered", "attended"].includes(body.status)) {
      return jsonResponse({ error: "Invalid status. Must be: approved, rejected, pending, registered, or attended" }, 400);
    }

    // Get the registration and event to verify ownership
    const reg = await env.DB.prepare(`
      SELECT r.*, e.organizer_name, e.organizer_alternate_name
      FROM registrations r
      JOIN events e ON r.event = e._id
      WHERE r._id = ?
    `).bind(regId).first() as { _id: string; agent: string; event: string; organizer_name: string; organizer_alternate_name: string } | null;

    if (!reg) {
      return jsonResponse({ error: "Registration not found" }, 404);
    }

    // Authorization check: Only the event host or the registrant can update status
    // Host can approve/reject/change to attended
    // Registrant can only cancel their own registration (done via DELETE)
    // For now, require user_id in request to verify identity
    // In production, this should come from an authenticated session
    if (body.user_id) {
      const requestingUser = body.user_id;
      const isHost = reg.organizer_alternate_name === `@${requestingUser}` ||
                     reg.organizer_name?.toLowerCase() === requestingUser.toLowerCase();
      const isRegistrant = reg.agent === requestingUser;

      // Registrant can't approve/reject - only host can
      if (!isHost && ["approved", "rejected", "attended"].includes(body.status)) {
        return jsonResponse({ error: "Only the event host can approve, reject, or mark attendance" }, 403);
      }

      // Non-owner/non-registrant can't update at all
      if (!isHost && !isRegistrant) {
        return jsonResponse({ error: "Not authorized to update this registration" }, 403);
      }
    }

    await env.DB.prepare(
      "UPDATE registrations SET rsvp_response = ? WHERE _id = ?"
    ).bind(body.status, regId).run();

    return jsonResponse({ message: `Registration ${body.status}` });
  }

  // DELETE /api/registrations/:id - Cancel registration
  if (regIdMatch && method === "DELETE") {
    const regId = regIdMatch[1];

    // Get registration to find event
    const reg = await env.DB.prepare(
      "SELECT * FROM registrations WHERE _id = ?"
    ).bind(regId).first() as { event: string } | null;

    if (reg) {
      await env.DB.prepare(
        "UPDATE registrations SET rsvp_response = 'cancelled', date_cancelled = datetime('now') WHERE _id = ?"
      ).bind(regId).run();

      // Update attendee count
      await env.DB.prepare(
        "UPDATE events SET attendee_count = attendee_count - 1 WHERE _id = ?"
      ).bind(reg.event).run();
    }

    return jsonResponse({ message: "Registration cancelled" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

// ============================================
// Media Handler (R2 + Images)
// ============================================

async function handleMedia(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const method = request.method;

  // POST /api/media/upload - Upload image to R2
  if (url.pathname === "/api/media/upload" && method === "POST") {
    const contentType = request.headers.get("Content-Type") || "";

    if (!contentType.startsWith("image/")) {
      return jsonResponse({ error: "Content-Type must be an image type" }, 400);
    }

    const key = `events/${generateId()}.${contentType.split("/")[1]}`;
    const body = await request.arrayBuffer();

    await env.MEDIA.put(key, body, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    return jsonResponse({
      key,
      url: `/api/media/${key}`,
      message: "Upload successful",
    }, 201);
  }

  // GET /api/media/:key - Serve image with optional transformations
  const mediaKeyMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
  if (mediaKeyMatch && method === "GET") {
    const key = mediaKeyMatch[1];
    const object = await env.MEDIA.get(key);

    if (!object) {
      return jsonResponse({ error: "File not found" }, 404);
    }

    // Check for transformation params with safe bounds (max 4000px to prevent DoS)
    const widthParam = url.searchParams.get("w");
    const heightParam = url.searchParams.get("h");
    const width = widthParam ? safeParseInt(widthParam, 0, 1, 4000) : undefined;
    const height = heightParam ? safeParseInt(heightParam, 0, 1, 4000) : undefined;
    const formatParam = url.searchParams.get("format");
    const format = ["webp", "avif", "jpeg", "png"].includes(formatParam || "") ? formatParam as "webp" | "avif" | "jpeg" | "png" : null;

    // If transformations requested and Images binding available
    if ((width || height || format) && env.IMAGES) {
      const transformed = env.IMAGES
        .input(object.body)
        .transform({
          width: width || undefined,
          height: height || undefined,
          fit: "cover",
          format: format || "webp",
          quality: 80,
        });

      const output = await transformed.output({ format: format || "webp" });

      return new Response(output, {
        headers: {
          "Content-Type": `image/${format || "webp"}`,
          "Cache-Control": "public, max-age=31536000",
          ...corsHeaders,
        },
      });
    }

    // Return original
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
        "ETag": object.httpEtag,
        ...corsHeaders,
      },
    });
  }

  // DELETE /api/media/:key - Delete image from R2
  if (mediaKeyMatch && method === "DELETE") {
    const key = mediaKeyMatch[1];
    await env.MEDIA.delete(key);
    return jsonResponse({ message: "File deleted" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

// ============================================
// Categories Handler
// ============================================

function handleCategories(): Response {
  // Categories matching Mukoko's 32 interest categories
  const categories = [
    // Technology & Innovation
    { id: "tech", name: "Technology", group: "Technology & Innovation" },
    { id: "ai-ml", name: "AI & Machine Learning", group: "Technology & Innovation" },
    { id: "fintech", name: "Fintech", group: "Technology & Innovation" },
    { id: "crypto", name: "Crypto & Web3", group: "Technology & Innovation" },
    // Business & Economy
    { id: "business", name: "Business", group: "Business & Economy" },
    { id: "economy", name: "Economy", group: "Business & Economy" },
    { id: "investment", name: "Investment", group: "Business & Economy" },
    { id: "real-estate", name: "Real Estate", group: "Business & Economy" },
    // Entertainment & Media
    { id: "music", name: "Music", group: "Entertainment & Media" },
    { id: "film-tv", name: "Film & TV", group: "Entertainment & Media" },
    { id: "gaming", name: "Gaming", group: "Entertainment & Media" },
    { id: "celebrity", name: "Celebrity & Entertainment", group: "Entertainment & Media" },
    // Sports
    { id: "football", name: "Football", group: "Sports" },
    { id: "sports-other", name: "Other Sports", group: "Sports" },
    { id: "fitness", name: "Fitness & Wellness", group: "Sports" },
    // Culture & Society
    { id: "culture", name: "Culture & Society", group: "Culture & Society" },
    { id: "fashion", name: "Fashion", group: "Culture & Society" },
    { id: "food", name: "Food & Drink", group: "Culture & Society" },
    { id: "travel", name: "Travel", group: "Culture & Society" },
    // News & Current Affairs
    { id: "politics", name: "Politics", group: "News & Current Affairs" },
    { id: "world-news", name: "World News", group: "News & Current Affairs" },
    { id: "local-news", name: "Local News", group: "News & Current Affairs" },
    // Education & Knowledge
    { id: "education", name: "Education", group: "Education & Knowledge" },
    { id: "science", name: "Science", group: "Education & Knowledge" },
    { id: "history", name: "History", group: "Education & Knowledge" },
    // Lifestyle
    { id: "relationships", name: "Relationships", group: "Lifestyle" },
    { id: "parenting", name: "Parenting", group: "Lifestyle" },
    { id: "spirituality", name: "Spirituality", group: "Lifestyle" },
    // Creative Arts
    { id: "art", name: "Art", group: "Creative Arts" },
    { id: "literature", name: "Literature", group: "Creative Arts" },
    { id: "comedy", name: "Comedy", group: "Creative Arts" },
    // Environment
    { id: "environment", name: "Environment", group: "Environment" },
  ];

  return jsonResponse({ categories });
}

// ============================================
// Cities Handler
// ============================================

function handleCities(): Response {
  const cities = [
    { city: "Harare", country: "Zimbabwe" },
    { city: "Bulawayo", country: "Zimbabwe" },
    { city: "Victoria Falls", country: "Zimbabwe" },
    { city: "Johannesburg", country: "South Africa" },
    { city: "Cape Town", country: "South Africa" },
    { city: "Nairobi", country: "Kenya" },
    { city: "Lagos", country: "Nigeria" },
    { city: "Accra", country: "Ghana" },
  ];

  return jsonResponse({ cities });
}

// ============================================
// Seed Sample Data Handler
// ============================================

async function handleSeedData(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Sample events data - marked as sample data
  const sampleEvents = [
    {
      _id: "african-tech-summit-2025",
      short_code: "aTs25xKp",
      slug: "african-tech-summit-2025",
      name: "African Tech Summit 2025",
      description: "Join us for the biggest tech gathering in Zimbabwe! The African Tech Summit brings together innovators, entrepreneurs, investors, and tech enthusiasts from across the continent.\n\nThis year's theme: \"Building Africa's Digital Future\"\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "28",
      date_display_month: "Dec",
      date_display_full: "Saturday, December 28, 2025",
      date_display_time: "9:00 AM - 6:00 PM (CAT)",
      start_date: "2025-12-28T09:00:00+02:00",
      location_name: "Rainbow Towers Hotel",
      location_street_address: "Pennefather Ave",
      location_locality: "Harare",
      location_country: "Zimbabwe",
      category: "Tech",
      keywords: JSON.stringify(["startup", "innovation", "networking", "AI", "fintech", "sample"]),
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      attendee_count: 247,
      maximum_attendee_capacity: 500,
      organizer_name: "Zimbabwe Tech Hub",
      organizer_alternate_name: "@zimtechhub",
      organizer_initials: "ZT",
      organizer_event_count: 12,
      offer_price: 25,
      offer_price_currency: "USD",
    },
    {
      _id: "amapiano-night-nye",
      short_code: "nYe31vFx",
      slug: "amapiano-night-nye-edition",
      name: "Amapiano Night: NYE Edition",
      description: "Ring in the new year with the best Amapiano beats! Live DJs, great vibes, and an unforgettable night at Victoria Falls.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "31",
      date_display_month: "Dec",
      date_display_full: "Tuesday, December 31, 2025",
      date_display_time: "8:00 PM - 4:00 AM (CAT)",
      start_date: "2025-12-31T20:00:00+02:00",
      location_name: "The Venue",
      location_street_address: "Park Way Drive",
      location_locality: "Victoria Falls",
      location_country: "Zimbabwe",
      category: "Music",
      keywords: JSON.stringify(["amapiano", "nye", "party", "dj", "dance", "sample"]),
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
      attendee_count: 89,
      maximum_attendee_capacity: 200,
      organizer_name: "Vic Falls Events",
      organizer_alternate_name: "@vicfallsevents",
      organizer_initials: "VF",
      organizer_event_count: 24,
      offer_price: 50,
      offer_price_currency: "USD",
    },
    {
      _id: "sunrise-yoga-chivero",
      short_code: "yGa15hRm",
      slug: "sunrise-yoga-lake-chivero",
      name: "Sunrise Yoga at Lake Chivero",
      description: "Start your day with peace and tranquility. Join us for a sunrise yoga session overlooking the beautiful Lake Chivero. All levels welcome. Mats provided.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "15",
      date_display_month: "Jan",
      date_display_full: "Wednesday, January 15, 2025",
      date_display_time: "5:30 AM - 7:30 AM (CAT)",
      start_date: "2025-01-15T05:30:00+02:00",
      location_name: "Lake Chivero Recreational Park",
      location_street_address: "Lake Chivero",
      location_locality: "Harare",
      location_country: "Zimbabwe",
      category: "Wellness",
      keywords: JSON.stringify(["yoga", "meditation", "nature", "fitness", "mindfulness", "sample"]),
      cover_gradient: "linear-gradient(135deg, #4B0082, #004D40)",
      attendee_count: 32,
      maximum_attendee_capacity: 50,
      organizer_name: "Harare Wellness",
      organizer_alternate_name: "@hararewellness",
      organizer_initials: "HW",
      organizer_event_count: 8,
    },
    {
      _id: "startup-founders-meetup",
      short_code: "sFm24kLp",
      slug: "startup-founders-meetup-harare",
      name: "Startup Founders Meetup",
      description: "Connect with fellow founders, share your journey, and learn from each other. Casual networking in a relaxed environment. Refreshments provided.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "24",
      date_display_month: "Dec",
      date_display_full: "Tuesday, December 24, 2025",
      date_display_time: "6:00 PM - 9:00 PM (CAT)",
      start_date: "2025-12-24T18:00:00+02:00",
      location_name: "Impact Hub",
      location_street_address: "16 Cork Road, Avondale",
      location_locality: "Harare",
      location_country: "Zimbabwe",
      category: "Professional",
      keywords: JSON.stringify(["startup", "founders", "networking", "entrepreneurship", "sample"]),
      cover_gradient: "linear-gradient(135deg, #004D40, #00796B)",
      attendee_count: 45,
      maximum_attendee_capacity: 60,
      organizer_name: "Impact Hub Harare",
      organizer_alternate_name: "@impactharare",
      organizer_initials: "IH",
      organizer_event_count: 32,
    },
    {
      _id: "poetry-wine-evening",
      short_code: "pWe27bNx",
      slug: "poetry-wine-evening-book-cafe",
      name: "Poetry & Wine Evening",
      description: "An intimate evening of spoken word, poetry readings, and fine wine. Share your work or simply enjoy the art. Open mic available.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "27",
      date_display_month: "Dec",
      date_display_full: "Friday, December 27, 2025",
      date_display_time: "7:00 PM - 10:00 PM (CAT)",
      start_date: "2025-12-27T19:00:00+02:00",
      location_name: "Book Cafe",
      location_street_address: "Fife Avenue",
      location_locality: "Harare",
      location_country: "Zimbabwe",
      category: "Culture",
      keywords: JSON.stringify(["poetry", "spoken-word", "wine", "art", "literature", "sample"]),
      cover_gradient: "linear-gradient(135deg, #4B0082, #7B1FA2)",
      attendee_count: 28,
      maximum_attendee_capacity: 40,
      organizer_name: "Book Cafe",
      organizer_alternate_name: "@bookcafeharare",
      organizer_initials: "BC",
      organizer_event_count: 56,
    },
    {
      _id: "community-cleanup-borrowdale",
      short_code: "cCb28qWz",
      slug: "community-cleanup-borrowdale",
      name: "Community Clean-Up: Borrowdale",
      description: "Join your neighbors in keeping Borrowdale beautiful. Gloves and bags provided. Coffee and snacks after! Bring the whole family.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "28",
      date_display_month: "Dec",
      date_display_full: "Saturday, December 28, 2025",
      date_display_time: "7:00 AM - 11:00 AM (CAT)",
      start_date: "2025-12-28T07:00:00+02:00",
      location_name: "Borrowdale Park",
      location_street_address: "Borrowdale Road",
      location_locality: "Harare",
      location_country: "Zimbabwe",
      category: "Community",
      keywords: JSON.stringify(["volunteer", "environment", "cleanup", "community-service", "sample"]),
      cover_gradient: "linear-gradient(135deg, #5D4037, #8D6E63)",
      attendee_count: 67,
      maximum_attendee_capacity: 100,
      organizer_name: "Borrowdale Residents",
      organizer_alternate_name: "@borrowdalera",
      organizer_initials: "BR",
      organizer_event_count: 6,
    },
    {
      _id: "jozi-tech-meetup",
      short_code: "jTm15xRk",
      slug: "johannesburg-tech-meetup",
      name: "Joburg Tech & Startups Meetup",
      description: "Monthly gathering of Johannesburg's tech community. Lightning talks, networking, and drinks. All welcome!\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "20",
      date_display_month: "Jan",
      date_display_full: "Monday, January 20, 2025",
      date_display_time: "6:00 PM - 9:00 PM (SAST)",
      start_date: "2025-01-20T18:00:00+02:00",
      location_name: "Workshop17",
      location_street_address: "Sandton City",
      location_locality: "Johannesburg",
      location_country: "South Africa",
      category: "Tech",
      keywords: JSON.stringify(["startup", "tech", "networking", "south-africa", "sample"]),
      cover_gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
      attendee_count: 156,
      maximum_attendee_capacity: 200,
      organizer_name: "Jozi Tech Community",
      organizer_alternate_name: "@jozitech",
      organizer_initials: "JT",
      organizer_event_count: 48,
    },
    {
      _id: "nairobi-design-week",
      short_code: "nDw10pLm",
      slug: "nairobi-design-week-2025",
      name: "Nairobi Design Week 2025",
      description: "East Africa's largest design festival. Exhibitions, workshops, talks, and networking with creatives from across the continent.\n\n⚠️ This is sample data for demonstration purposes.",
      date_display_day: "10",
      date_display_month: "Feb",
      date_display_full: "Monday, February 10, 2025",
      date_display_time: "10:00 AM - 6:00 PM (EAT)",
      start_date: "2025-02-10T10:00:00+03:00",
      location_name: "Nairobi National Museum",
      location_street_address: "Museum Hill",
      location_locality: "Nairobi",
      location_country: "Kenya",
      category: "Culture",
      keywords: JSON.stringify(["design", "art", "exhibition", "creative", "kenya", "sample"]),
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      attendee_count: 320,
      maximum_attendee_capacity: 500,
      organizer_name: "Nairobi Design Week",
      organizer_alternate_name: "@nairobidesign",
      organizer_initials: "ND",
      organizer_event_count: 5,
      offer_price: 20,
      offer_price_currency: "USD",
    },
  ];

  let inserted = 0;
  let errors = 0;

  for (const event of sampleEvents) {
    try {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO events (
          _id, short_code, slug, name, description,
          date_display_day, date_display_month, date_display_full, date_display_time, start_date,
          location_name, location_street_address, location_locality, location_country,
          category, keywords, image, cover_gradient,
          attendee_count, maximum_attendee_capacity, event_attendance_mode,
          organizer_name, organizer_alternate_name, organizer_initials, organizer_event_count,
          offer_price, offer_price_currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event._id,
        event.short_code,
        event.slug,
        event.name,
        event.description,
        event.date_display_day,
        event.date_display_month,
        event.date_display_full,
        event.date_display_time,
        event.start_date,
        event.location_name,
        event.location_street_address,
        event.location_locality,
        event.location_country,
        event.category,
        event.keywords,
        (event as Record<string, unknown>).image || null,
        event.cover_gradient || null,
        event.attendee_count,
        event.maximum_attendee_capacity || null,
        "OfflineEventAttendanceMode",
        event.organizer_name,
        event.organizer_alternate_name,
        event.organizer_initials,
        event.organizer_event_count,
        (event as Record<string, unknown>).offer_price || null,
        (event as Record<string, unknown>).offer_price_currency || null
      ).run();
      inserted++;
    } catch (e) {
      console.error(`Error inserting ${event._id}:`, e);
      errors++;
    }
  }

  return jsonResponse({
    message: "Sample data seeded successfully",
    inserted,
    errors,
    note: "All sample events are marked with 'sample' tag and disclaimer in description",
  });
}

// ============================================
// Event Reviews Handler
// ============================================

async function handleEventReviews(
  eventId: string,
  request: Request,
  env: Env
): Promise<Response> {
  // GET - List reviews for an event (PUBLIC)
  if (request.method === "GET") {
    interface ReviewRow {
      _id: string;
      item_reviewed: string;
      author: string;
      rating_value: number;
      review_body: string | null;
      helpful_count: number;
      is_verified_attendee: number;
      date_published: string;
      user_name: string | null;
    }

    const reviewsResult = await env.DB.prepare(`
      SELECT r.*, u.name as user_name
      FROM event_reviews r
      LEFT JOIN users u ON r.author = u._id
      WHERE r.item_reviewed = ?
      ORDER BY r.helpful_count DESC, r.date_published DESC
      LIMIT 50
    `).bind(eventId).all();

    const reviews: EventReview[] = (reviewsResult.results as ReviewRow[]).map((row) => ({
      _id: row._id,
      itemReviewed: row.item_reviewed,
      author: row.author,
      authorName: row.user_name || "Anonymous",
      authorInitials: getInitials(row.user_name || "Anonymous"),
      reviewRating: {
        "@type": "Rating" as const,
        ratingValue: row.rating_value,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: row.review_body || undefined,
      helpfulCount: row.helpful_count,
      isVerifiedAttendee: !!row.is_verified_attendee,
      datePublished: row.date_published,
    }));

    // Get rating stats
    interface StatsRow {
      avg_rating: number;
      total_reviews: number;
      rating_1: number;
      rating_2: number;
      rating_3: number;
      rating_4: number;
      rating_5: number;
    }

    const statsResult = await env.DB.prepare(`
      SELECT
        AVG(rating_value) as avg_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating_value = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN rating_value = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating_value = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating_value = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating_value = 5 THEN 1 ELSE 0 END) as rating_5
      FROM event_reviews
      WHERE item_reviewed = ?
    `).bind(eventId).first() as StatsRow | null;

    const stats: ReviewStats = {
      averageRating: statsResult?.avg_rating || 0,
      totalReviews: statsResult?.total_reviews || 0,
      distribution: {
        1: statsResult?.rating_1 || 0,
        2: statsResult?.rating_2 || 0,
        3: statsResult?.rating_3 || 0,
        4: statsResult?.rating_4 || 0,
        5: statsResult?.rating_5 || 0,
      },
    };

    return jsonResponse({ reviews, stats });
  }

  // POST - Create a review (requires auth)
  if (request.method === "POST") {
    const body = await request.json() as {
      userId: string;
      rating: number;
      comment?: string;
    };

    if (!body.userId || !body.rating || body.rating < 1 || body.rating > 5) {
      return jsonResponse({ error: "userId and rating (1-5) required" }, 400);
    }

    // Check if user was a verified attendee
    const registration = await env.DB.prepare(
      "SELECT _id FROM registrations WHERE event = ? AND agent = ? AND rsvp_response IN ('registered', 'approved', 'checked_in')"
    ).bind(eventId, body.userId).first();

    const id = generateId();

    try {
      await env.DB.prepare(`
        INSERT INTO event_reviews (_id, item_reviewed, author, rating_value, review_body, is_verified_attendee)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        eventId,
        body.userId,
        body.rating,
        body.comment || null,
        registration ? 1 : 0
      ).run();

      // Track in analytics queue if available
      if (env.ANALYTICS_QUEUE) {
        await env.ANALYTICS_QUEUE.send({
          type: "review",
          eventId,
          userId: body.userId,
          data: { rating: body.rating },
          timestamp: new Date().toISOString(),
        });
      }

      return jsonResponse({ id, message: "Review submitted successfully" }, 201);
    } catch {
      // Likely duplicate review
      return jsonResponse({ error: "You have already reviewed this event" }, 409);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ============================================
// Review Helpful Vote Handler
// ============================================

async function handleReviewHelpful(
  reviewId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json() as { userId: string };

  if (!body.userId) {
    return jsonResponse({ error: "userId required" }, 400);
  }

  try {
    // Check if already voted
    const existing = await env.DB.prepare(
      "SELECT _id FROM review_helpful_votes WHERE review_id = ? AND user_id = ?"
    ).bind(reviewId, body.userId).first();

    if (existing) {
      return jsonResponse({ error: "Already voted" }, 409);
    }

    // Add vote
    await env.DB.prepare(
      "INSERT INTO review_helpful_votes (_id, review_id, user_id) VALUES (?, ?, ?)"
    ).bind(generateId(), reviewId, body.userId).run();

    // Update helpful count
    await env.DB.prepare(
      "UPDATE event_reviews SET helpful_count = helpful_count + 1 WHERE _id = ?"
    ).bind(reviewId).run();

    return jsonResponse({ message: "Vote recorded" });
  } catch {
    return jsonResponse({ error: "Failed to record vote" }, 500);
  }
}

// ============================================
// Event Stats Handler (Open Data)
// ============================================

async function handleEventStats(eventId: string, env: Env): Promise<Response> {
  interface StatsRow {
    views: number;
    unique_views: number;
    rsvps: number;
    checkins: number;
    referrals: number;
    views_7_days_ago: number;
  }

  // Get aggregated stats
  const stats = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM event_views WHERE event_id = ?) as views,
      (SELECT COUNT(DISTINCT COALESCE(user_id, source || ip_hash)) FROM event_views WHERE event_id = ?) as unique_views,
      (SELECT COUNT(*) FROM registrations WHERE event = ? AND rsvp_response != 'cancelled') as rsvps,
      (SELECT COUNT(*) FROM registrations WHERE event = ? AND checked_in_at IS NOT NULL) as checkins,
      (SELECT COUNT(*) FROM referrals WHERE event = ? AND status = 'converted') as referrals,
      (SELECT COUNT(*) FROM event_views WHERE event_id = ? AND date_created < datetime('now', '-7 days')) as views_7_days_ago
  `).bind(eventId, eventId, eventId, eventId, eventId, eventId).first() as StatsRow | null;

  // Calculate trend (week-over-week change)
  const currentViews = stats?.views || 0;
  const lastWeekViews = stats?.views_7_days_ago || 0;
  const recentViews = currentViews - lastWeekViews;
  const trend = lastWeekViews > 0 ? Math.round(((recentViews - lastWeekViews) / lastWeekViews) * 100) : 0;

  // Determine if "hot" (high engagement)
  const isHot = trend > 50 || (currentViews > 100 && trend > 20);

  // Get top sources
  interface SourceRow {
    source: string;
    count: number;
  }
  const sourcesResult = await env.DB.prepare(`
    SELECT source, COUNT(*) as count
    FROM event_views
    WHERE event_id = ?
    GROUP BY source
    ORDER BY count DESC
    LIMIT 5
  `).bind(eventId).all();

  // Get top cities from registrations
  interface CityRow {
    city: string;
    count: number;
  }
  const citiesResult = await env.DB.prepare(`
    SELECT u.address_locality as city, COUNT(*) as count
    FROM registrations r
    JOIN users u ON r.agent = u._id
    WHERE r.event = ? AND u.address_locality IS NOT NULL
    GROUP BY u.address_locality
    ORDER BY count DESC
    LIMIT 5
  `).bind(eventId).all();

  const eventStats: EventStats = {
    eventId,
    views: stats?.views || 0,
    uniqueViews: stats?.unique_views || 0,
    rsvps: stats?.rsvps || 0,
    checkins: stats?.checkins || 0,
    referrals: stats?.referrals || 0,
    trend,
    isHot,
    topSources: (sourcesResult.results as SourceRow[]).map((r) => ({
      source: r.source,
      count: r.count,
    })),
    topCities: (citiesResult.results as CityRow[]).map((r) => ({
      city: r.city,
      count: r.count,
    })),
  };

  // Track this view in Analytics Engine if available
  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: [eventId, "stats_view"],
      doubles: [1],
      indexes: [eventId],
    });
  }

  return jsonResponse({ stats: eventStats });
}

// ============================================
// Event Referrals Leaderboard Handler
// ============================================

async function handleEventReferrals(eventId: string, env: Env): Promise<Response> {
  interface LeaderboardRow {
    user_id: string;
    user_name: string | null;
    referral_count: number;
    conversion_count: number;
  }

  const result = await env.DB.prepare(`
    SELECT
      r.referrer_user_id as user_id,
      u.name as user_name,
      COUNT(*) as referral_count,
      SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END) as conversion_count
    FROM referrals r
    LEFT JOIN users u ON r.referrer_user_id = u._id
    WHERE r.event = ?
    GROUP BY r.referrer_user_id
    ORDER BY conversion_count DESC, referral_count DESC
    LIMIT 10
  `).bind(eventId).all();

  const leaderboard: ReferralLeaderboardEntry[] = (result.results as LeaderboardRow[]).map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    userName: row.user_name || "Anonymous",
    userInitials: getInitials(row.user_name || "Anonymous"),
    referralCount: row.referral_count,
    conversionCount: row.conversion_count,
  }));

  return jsonResponse({ leaderboard });
}

// ============================================
// Track Referral Handler
// ============================================

async function handleTrackReferral(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    eventId: string;
    referralCode: string;
    referredUserId?: string;
  };

  if (!body.eventId || !body.referralCode) {
    return jsonResponse({ error: "eventId and referralCode required" }, 400);
  }

  // Look up the referral code
  interface CodeRow {
    user_id: string;
  }
  const codeResult = await env.DB.prepare(
    "SELECT user_id FROM user_referral_codes WHERE code = ?"
  ).bind(body.referralCode).first() as CodeRow | null;

  if (!codeResult) {
    return jsonResponse({ error: "Invalid referral code" }, 404);
  }

  const id = generateId();

  await env.DB.prepare(`
    INSERT INTO referrals (_id, event, referrer_user_id, referred_user_id, referral_code, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.eventId,
    codeResult.user_id,
    body.referredUserId || null,
    body.referralCode,
    body.referredUserId ? "converted" : "pending"
  ).run();

  // Track in analytics
  if (env.ANALYTICS_QUEUE) {
    await env.ANALYTICS_QUEUE.send({
      type: "referral",
      eventId: body.eventId,
      userId: codeResult.user_id,
      data: { referralCode: body.referralCode, converted: !!body.referredUserId },
      timestamp: new Date().toISOString(),
    });
  }

  return jsonResponse({ id, message: "Referral tracked" }, 201);
}

// ============================================
// User Referral Code Handler
// ============================================

async function handleUserReferralCode(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  // GET - Get user's referral code
  if (request.method === "GET") {
    interface CodeRow {
      code: string;
      total_referrals: number;
      total_conversions: number;
    }

    const result = await env.DB.prepare(
      "SELECT code, total_referrals, total_conversions FROM user_referral_codes WHERE user_id = ?"
    ).bind(userId).first() as CodeRow | null;

    if (!result) {
      return jsonResponse({ error: "No referral code found" }, 404);
    }

    return jsonResponse({
      code: result.code,
      totalReferrals: result.total_referrals,
      totalConversions: result.total_conversions,
    });
  }

  // POST - Generate a new referral code
  if (request.method === "POST") {
    // Check if user already has a code
    const existing = await env.DB.prepare(
      "SELECT code FROM user_referral_codes WHERE user_id = ?"
    ).bind(userId).first();

    if (existing) {
      return jsonResponse({ error: "User already has a referral code", code: (existing as { code: string }).code }, 409);
    }

    const code = generateReferralCode();

    await env.DB.prepare(`
      INSERT INTO user_referral_codes (_id, user_id, code)
      VALUES (?, ?, ?)
    `).bind(generateId(), userId, code).run();

    return jsonResponse({ code }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ============================================
// Host Reputation Handler
// ============================================

async function handleHostReputation(userId: string, env: Env): Promise<Response> {
  interface UserRow {
    _id: string;
    name: string;
    alternate_name: string | null;
  }

  // Get user basic info
  const user = await env.DB.prepare(
    "SELECT _id, name, alternate_name FROM users WHERE _id = ?"
  ).bind(userId).first() as UserRow | null;

  if (!user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  interface StatsRow {
    events_hosted: number;
    total_attendees: number;
    avg_attendance: number;
  }

  // Get host stats from hosted events
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as events_hosted,
      SUM(attendee_count) as total_attendees,
      AVG(attendee_count) as avg_attendance
    FROM events
    WHERE organizer_alternate_name = ? OR _id IN (
      SELECT event_id FROM event_hosts WHERE user_id = ?
    )
  `).bind(user.alternate_name || "", userId).first() as StatsRow | null;

  interface RatingRow {
    avg_rating: number;
    review_count: number;
  }

  // Get average rating from all their events
  const ratings = await env.DB.prepare(`
    SELECT
      AVG(r.rating_value) as avg_rating,
      COUNT(*) as review_count
    FROM event_reviews r
    JOIN events e ON r.item_reviewed = e._id
    WHERE e.organizer_alternate_name = ? OR e._id IN (
      SELECT event_id FROM event_hosts WHERE user_id = ?
    )
  `).bind(user.alternate_name || "", userId).first() as RatingRow | null;

  // Determine badges
  const badges: string[] = [];
  const eventsHosted = stats?.events_hosted || 0;
  const avgRating = ratings?.avg_rating || 0;
  const reviewCount = ratings?.review_count || 0;

  if (eventsHosted >= 10 && avgRating >= 4.5) badges.push("Trusted Host");
  if (eventsHosted >= 25) badges.push("Veteran");
  if (eventsHosted >= 5 && eventsHosted < 10 && avgRating >= 4.0) badges.push("Rising Star");
  if (reviewCount >= 50 && avgRating >= 4.8) badges.push("Community Favorite");
  if ((stats?.avg_attendance || 0) >= 50) badges.push("Crowd Puller");

  const hostStats: HostStats = {
    userId: user._id,
    name: user.name,
    alternateName: user.alternate_name || undefined,
    initials: getInitials(user.name),
    eventsHosted,
    totalAttendees: stats?.total_attendees || 0,
    avgAttendanceRate: Math.round(stats?.avg_attendance || 0),
    avgRating: Math.round((avgRating || 0) * 10) / 10,
    totalReviews: reviewCount,
    badges,
  };

  return jsonResponse({ host: hostStats });
}

// ============================================
// Community Stats Handler
// ============================================

async function handleCommunityStats(url: URL, env: Env): Promise<Response> {
  const city = url.searchParams.get("city");

  interface StatsRow {
    total_events: number;
    total_attendees: number;
    active_hosts: number;
  }

  // Build query based on whether city filter is applied
  let statsQuery = `
    SELECT
      COUNT(*) as total_events,
      SUM(attendee_count) as total_attendees,
      COUNT(DISTINCT organizer_alternate_name) as active_hosts
    FROM events
    WHERE is_published = TRUE AND event_status = 'EventScheduled'
  `;
  const params: string[] = [];

  if (city) {
    statsQuery += " AND location_locality = ?";
    params.push(city);
  }

  const stats = await env.DB.prepare(statsQuery).bind(...params).first() as StatsRow | null;

  interface CategoryRow {
    category: string;
    count: number;
    last_week: number;
  }

  // Get trending categories (comparing this week vs last week)
  const trendingQuery = `
    SELECT
      category,
      COUNT(*) as count,
      (SELECT COUNT(*) FROM events e2
       WHERE e2.category = events.category
       AND e2.date_created < datetime('now', '-7 days')
       ${city ? "AND e2.location_locality = ?" : ""}
      ) as last_week
    FROM events
    WHERE date_created >= datetime('now', '-7 days')
    ${city ? "AND location_locality = ?" : ""}
    GROUP BY category
    ORDER BY count DESC
    LIMIT 5
  `;

  const trendingParams = city ? [city, city] : [];
  const trendingResult = await env.DB.prepare(trendingQuery).bind(...trendingParams).all();

  interface VenueRow {
    venue: string;
    count: number;
  }

  // Get popular venues
  const venueQuery = `
    SELECT location_name as venue, COUNT(*) as count
    FROM events
    WHERE is_published = TRUE
    ${city ? "AND location_locality = ?" : ""}
    GROUP BY location_name
    ORDER BY count DESC
    LIMIT 5
  `;

  const venueParams = city ? [city] : [];
  const venuesResult = await env.DB.prepare(venueQuery).bind(...venueParams).all();

  const communityStats: CommunityStats = {
    city: city || undefined,
    totalEvents: stats?.total_events || 0,
    totalAttendees: stats?.total_attendees || 0,
    activeHosts: stats?.active_hosts || 0,
    trendingCategories: (trendingResult.results as CategoryRow[]).map((row) => ({
      category: row.category,
      count: row.count,
    })),
    peakTime: "Wed 6-8pm", // Would need more sophisticated query for real data
    popularVenues: (venuesResult.results as VenueRow[]).map((row) => ({
      venue: row.venue,
      count: row.count,
    })),
  };

  return jsonResponse({ stats: communityStats });
}

// ============================================
// Trending Events Handler
// ============================================

async function handleTrendingEvents(url: URL, env: Env): Promise<Response> {
  const city = url.searchParams.get("city");
  // Use safe parsing with bounds (min: 1, max: 50)
  const limit = safeParseInt(url.searchParams.get("limit"), 10, 1, 50);

  // Get events with view counts and calculate trend
  let query = `
    SELECT e.*,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e._id) as views,
      (SELECT COUNT(*) FROM event_views WHERE event_id = e._id AND date_created >= datetime('now', '-7 days')) as recent_views
    FROM events e
    WHERE e.is_published = TRUE AND e.event_status = 'EventScheduled'
    AND e.start_date >= datetime('now')
  `;
  const params: (string | number)[] = [];

  if (city) {
    query += " AND e.location_locality = ?";
    params.push(city);
  }

  query += " ORDER BY recent_views DESC, views DESC LIMIT ?";
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();

  interface EventRow extends Record<string, unknown> {
    views: number;
    recent_views: number;
  }

  const events = (result.results as EventRow[]).map((row) => {
    const event = dbRowToEvent(row);
    return {
      ...event,
      views: row.views,
      trend: row.views > 10 ? Math.round((row.recent_views / row.views) * 100) : 0,
      isHot: row.recent_views > 20,
    };
  });

  return jsonResponse({ events });
}

// ============================================
// Utility Functions
// ============================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

// Convert database row to Event object
function dbRowToEvent(row: Record<string, unknown>): Event {
  const attendanceMode = row.event_attendance_mode as string | undefined;
  const isOnline = attendanceMode === "OnlineEventAttendanceMode";
  return {
    _id: row._id as string,
    name: row.name as string,
    description: row.description as string,
    startDate: row.start_date as string,
    eventAttendanceMode: isOnline ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode",
    eventStatus: ((row.event_status as string) === "EventCancelled" ? "EventCancelled" : "EventScheduled") as Event["eventStatus"],
    image: row.image as string | undefined,
    keywords: safeParseJSON((row.keywords as string), []) as string[],
    maximumAttendeeCapacity: row.maximum_attendee_capacity as number | undefined,
    location: isOnline
      ? { "@type": "VirtualLocation" as const, url: (row.meeting_url as string) || "" }
      : {
          "@type": "Place" as const,
          name: row.location_name as string,
          address: {
            "@type": "PostalAddress" as const,
            streetAddress: row.location_street_address as string,
            addressLocality: row.location_locality as string,
            addressCountry: row.location_country as string,
          },
        },
    organizer: {
      "@type": "Person" as const,
      name: row.organizer_name as string,
      alternateName: row.organizer_alternate_name as string,
      initials: row.organizer_initials as string,
      eventCount: row.organizer_event_count as number,
    },
    offers: row.offer_price
      ? {
          "@type": "Offer" as const,
          price: row.offer_price as number,
          priceCurrency: (row.offer_price_currency as string) || "USD",
          availability: "InStock",
          url: row.offer_url as string | undefined,
        }
      : undefined,
    shortCode: row.short_code as string,
    slug: row.slug as string,
    category: row.category as string,
    attendeeCount: row.attendee_count as number,
    friendsCount: row.friends_count as number | undefined,
    coverGradient: row.cover_gradient as string | undefined,
    isPublished: row.is_published !== false && row.is_published !== 0,
    meetingUrl: row.meeting_url as string | undefined,
    meetingPlatform: row.meeting_platform as "zoom" | "google_meet" | "teams" | "other" | undefined,
    dateDisplay: {
      day: row.date_display_day as string,
      month: row.date_display_month as string,
      full: row.date_display_full as string,
      time: row.date_display_time as string,
    },
    dateCreated: row.date_created as string,
    dateModified: row.date_modified as string,
  };
}

// ============================================
// ADMIN DASHBOARD HANDLERS
// ============================================

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Helper to get authenticated admin user with role check
async function getAdminUser(request: Request, env: Env, requiredRole: UserRole): Promise<AdminUser | null> {
  const authResult = await getAuthenticatedUser(request, env);
  if (!authResult.user) return null;
  const stytchUser = authResult.user;

  interface DbUserRow {
    _id: string;
    email: string;
    name: string;
    role: string | null;
  }

  const user = await env.DB.prepare(
<<<<<<< Updated upstream
    "SELECT id, email, name, role FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUserRow | null;
=======
    "SELECT _id, email, name, role FROM users WHERE stytch_user_id = ? OR email = ?"
  ).bind(stytchUser.userId, stytchUser.email).first() as DbUserRow | null;
>>>>>>> Stashed changes

  if (!user) return null;

  const userRole = (user.role || 'user') as UserRole;
  if (!hasPermission(userRole, requiredRole)) return null;

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: userRole,
  };
}

// GET /api/admin/stats - Dashboard statistics
async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'moderator');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - moderator access required" }, 401);
  }

  // Get counts
  const [usersResult, eventsResult, registrationsResult] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as count FROM users").first() as Promise<{ count: number } | null>,
    env.DB.prepare("SELECT COUNT(*) as count FROM events").first() as Promise<{ count: number } | null>,
    env.DB.prepare("SELECT COUNT(*) as count FROM registrations").first() as Promise<{ count: number } | null>,
  ]);

  // Get active events (future events)
  const activeEventsResult = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM events WHERE start_date >= datetime('now')"
  ).first() as { count: number } | null;

  // Get recent views (last 30 days)
  const viewsResult = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM event_views WHERE viewed_at >= datetime('now', '-30 days')"
  ).first() as { count: number } | null;

  // Get recent events
  interface EventRow {
    _id: string;
    name: string;
    date_display_full: string;
    attendee_count: number;
    start_date: string;
  }
  const recentEventsResult = await env.DB.prepare(
    "SELECT _id, name, date_display_full, attendee_count, start_date FROM events ORDER BY date_created DESC LIMIT 5"
  ).all() as { results: EventRow[] };

  const now = new Date();
  const recentEvents = recentEventsResult.results.map(e => {
    const eventDate = new Date(e.start_date);
    let status: 'upcoming' | 'ongoing' | 'past' = 'upcoming';
    if (eventDate < now) status = 'past';
    else if (eventDate.toDateString() === now.toDateString()) status = 'ongoing';

    return {
      _id: e._id,
      name: e.name,
      date: e.date_display_full,
      attendeeCount: e.attendee_count,
      status,
    };
  });

  // Get recent users
  interface UserRow {
    _id: string;
    name: string;
    email: string;
    date_created: string;
  }
  const recentUsersResult = await env.DB.prepare(
    "SELECT _id, name, email, date_created FROM users ORDER BY date_created DESC LIMIT 5"
  ).all() as { results: UserRow[] };

  const recentUsers = recentUsersResult.results.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    createdAt: new Date(u.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  // Get support tickets (if table exists)
  let tickets: Array<{ _id: string; subject: string; status: string; createdAt: string }> = [];
  try {
    interface TicketRow {
      _id: string;
      subject: string;
      status: string;
      date_created: string;
    }
    const ticketsResult = await env.DB.prepare(
      "SELECT _id, subject, status, date_created FROM support_tickets ORDER BY date_created DESC LIMIT 5"
    ).all() as { results: TicketRow[] };

    tickets = ticketsResult.results.map(t => ({
      _id: t._id,
      subject: t.subject,
      status: t.status,
      createdAt: new Date(t.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  } catch {
    // Table doesn't exist yet
  }

  return jsonResponse({
    stats: {
      totalUsers: usersResult?.count || 0,
      totalEvents: eventsResult?.count || 0,
      totalRegistrations: registrationsResult?.count || 0,
      activeEvents: activeEventsResult?.count || 0,
      userGrowth: 0, // Would need historical data
      eventGrowth: 0,
      recentViews: viewsResult?.count || 0,
      viewsGrowth: 0,
    },
    recentEvents,
    recentUsers,
    tickets,
  });
}

// GET /api/admin/users - List users with pagination
async function handleAdminUsers(request: Request, url: URL, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'admin');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - admin access required" }, 401);
  }

  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0, 0, 10000);
  const search = url.searchParams.get("search") || "";

  let query = "SELECT * FROM users";
  let countQuery = "SELECT COUNT(*) as count FROM users";
  const params: string[] = [];

  if (search) {
    query += " WHERE name LIKE ? OR email LIKE ?";
    countQuery += " WHERE name LIKE ? OR email LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY date_created DESC LIMIT ? OFFSET ?";

  interface UserRow {
    _id: string;
    email: string;
    name: string;
    alternate_name: string | null;
    image: string | null;
    address_locality: string | null;
    address_country: string | null;
    events_attended: number;
    events_hosted: number;
    role: string | null;
    date_created: string;
  }

  const [usersResult, countResult] = await Promise.all([
    env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: UserRow[] }>,
    env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
  ]);

  const users = usersResult.results.map(u => ({
    id: u._id,
    email: u.email,
    name: u.name,
    handle: u.alternate_name,
    avatar_url: u.image,
    city: u.address_locality,
    country: u.address_country,
    events_attended: u.events_attended || 0,
    events_hosted: u.events_hosted || 0,
    role: u.role || 'user',
    status: 'active' as const, // Would need a status field in DB
    created_at: u.date_created,
  }));

  return jsonResponse({
    users,
    total: countResult?.count || 0,
  });
}

// POST /api/admin/users/:id/suspend, activate, role
async function handleAdminUserAction(
  userId: string,
  action: string,
  request: Request,
  env: Env
): Promise<Response> {
  const requiredRole: UserRole = action === 'role' ? 'super_admin' : 'admin';
  const admin = await getAdminUser(request, env, requiredRole);
  if (!admin) {
    return jsonResponse({ error: `Unauthorized - ${requiredRole} access required` }, 401);
  }

  // Prevent self-modification for dangerous actions
  if (userId === admin.id && (action === 'suspend' || action === 'role')) {
    return jsonResponse({ error: "Cannot modify your own account" }, 400);
  }

  switch (action) {
    case 'suspend':
      // In a real implementation, you'd add a status field
      // For now, we'll just return success
      return jsonResponse({ message: "User suspended" });

    case 'activate':
      return jsonResponse({ message: "User activated" });

    case 'role': {
      const body = await request.json() as { role?: string };
      const newRole = body.role as UserRole;

      if (!['user', 'moderator', 'admin', 'super_admin'].includes(newRole)) {
        return jsonResponse({ error: "Invalid role" }, 400);
      }

      // Only super_admin can promote to super_admin
      if (newRole === 'super_admin' && admin.role !== 'super_admin') {
        return jsonResponse({ error: "Only super_admin can assign super_admin role" }, 403);
      }

      await env.DB.prepare(
        "UPDATE users SET role = ?, date_modified = datetime('now') WHERE _id = ?"
      ).bind(newRole, userId).run();

      return jsonResponse({ message: `User role updated to ${newRole}` });
    }

    default:
      return jsonResponse({ error: "Unknown action" }, 400);
  }
}

// GET /api/admin/events - List events with pagination
async function handleAdminEvents(request: Request, url: URL, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'moderator');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - moderator access required" }, 401);
  }

  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0, 0, 10000);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";

  let query = "SELECT * FROM events WHERE 1=1";
  let countQuery = "SELECT COUNT(*) as count FROM events WHERE 1=1";
  const params: (string | number)[] = [];

  if (search) {
    query += " AND (name LIKE ? OR description LIKE ?)";
    countQuery += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const now = new Date().toISOString();
  if (status === 'upcoming') {
    query += " AND start_date >= ?";
    countQuery += " AND start_date >= ?";
    params.push(now);
  } else if (status === 'past') {
    query += " AND start_date < ?";
    countQuery += " AND start_date < ?";
    params.push(now);
  } else if (status === 'cancelled') {
    query += " AND event_status = 'EventCancelled'";
    countQuery += " AND event_status = 'EventCancelled'";
  }

  query += " ORDER BY date_created DESC LIMIT ? OFFSET ?";

  const [eventsResult, countResult] = await Promise.all([
    env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: Record<string, unknown>[] }>,
    env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
  ]);

  const nowDate = new Date();
  const events = eventsResult.results.map((row) => {
    const event = dbRowToEvent(row);
    const eventDate = new Date(event.startDate);
    let eventStatus: 'upcoming' | 'ongoing' | 'past' | 'cancelled' = 'upcoming';

    if ((row.event_status as string) === 'EventCancelled') eventStatus = 'cancelled';
    else if (eventDate < nowDate) eventStatus = 'past';
    else if (eventDate.toDateString() === nowDate.toDateString()) eventStatus = 'ongoing';

    return {
      _id: event._id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      dateDisplay: event.dateDisplay,
      location: event.location,
      category: event.category,
      attendeeCount: event.attendeeCount,
      maximumAttendeeCapacity: event.maximumAttendeeCapacity,
      organizer: event.organizer,
      status: eventStatus,
      dateCreated: event.dateCreated,
    };
  });

  return jsonResponse({
    events,
    total: countResult?.count || 0,
  });
}

// DELETE /api/admin/events/:id
async function handleAdminDeleteEvent(eventId: string, request: Request, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'moderator');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - moderator access required" }, 401);
  }

  // Check event exists
  const event = await env.DB.prepare("SELECT _id, name FROM events WHERE _id = ?").bind(eventId).first();
  if (!event) {
    return jsonResponse({ error: "Event not found" }, 404);
  }

  // Delete event (cascades to registrations via foreign key)
  await env.DB.prepare("DELETE FROM events WHERE _id = ?").bind(eventId).run();

  // Remove from vector index
  try {
    await removeEventFromIndex(env.VECTORIZE, eventId);
  } catch (error) {
    console.error("Failed to remove event from index:", error);
  }

  return jsonResponse({ message: "Event deleted successfully" });
}

// GET /api/admin/support - List support tickets
async function handleAdminSupport(request: Request, url: URL, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'admin');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - admin access required" }, 401);
  }

  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0, 0, 10000);
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";

  try {
    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u._id
      WHERE 1=1
    `;
    let countQuery = "SELECT COUNT(*) as count FROM support_tickets WHERE 1=1";
    const params: string[] = [];

    if (status && status !== 'all') {
      query += " AND t.status = ?";
      countQuery += " AND status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (t.subject LIKE ? OR t.description LIKE ?)";
      countQuery += " AND (subject LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY t.date_created DESC LIMIT ? OFFSET ?";

    interface TicketRow {
      _id: string;
      user_id: string | null;
      user_name: string | null;
      user_email: string | null;
      subject: string;
      description: string;
      category: string;
      priority: string;
      status: string;
      date_created: string;
      date_modified: string;
    }

    const [ticketsResult, countResult] = await Promise.all([
      env.DB.prepare(query).bind(...params, limit, offset).all() as Promise<{ results: TicketRow[] }>,
      env.DB.prepare(countQuery).bind(...params).first() as Promise<{ count: number } | null>,
    ]);

    // Get messages for each ticket
    const tickets = await Promise.all(ticketsResult.results.map(async (t) => {
      interface MessageRow {
        _id: string;
        sender_type: string;
        sender_id: string | null;
        content: string;
        date_created: string;
      }

      const messagesResult = await env.DB.prepare(
        "SELECT m.*, u.name as sender_name FROM support_messages m LEFT JOIN users u ON m.sender_id = u._id WHERE m.ticket_id = ? ORDER BY m.date_created ASC"
      ).bind(t._id).all() as { results: (MessageRow & { sender_name: string | null })[] };

      return {
        _id: t._id,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority as 'low' | 'medium' | 'high',
        status: t.status as 'open' | 'pending' | 'resolved',
        user: t.user_id ? {
          _id: t.user_id,
          name: t.user_name || 'Unknown',
          email: t.user_email || '',
        } : undefined,
        messages: messagesResult.results.map(m => ({
          _id: m._id,
          content: m.content,
          sender: m.sender_type as 'user' | 'admin',
          senderName: m.sender_name || (m.sender_type === 'admin' ? 'Support Team' : 'User'),
          createdAt: m.date_created,
        })),
        createdAt: t.date_created,
        updatedAt: t.date_modified,
      };
    }));

    return jsonResponse({
      tickets,
      total: countResult?.count || 0,
    });
  } catch (error) {
    // Table might not exist yet
    console.error("Support tickets error:", error);
    return jsonResponse({
      tickets: [],
      total: 0,
    });
  }
}

// PUT /api/admin/support/:id/status
async function handleAdminTicketStatus(ticketId: string, request: Request, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'admin');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - admin access required" }, 401);
  }

  const body = await request.json() as { status?: string };
  const status = body.status;

  if (!status || !['open', 'pending', 'resolved'].includes(status)) {
    return jsonResponse({ error: "Invalid status" }, 400);
  }

  try {
    await env.DB.prepare(
      "UPDATE support_tickets SET status = ?, date_modified = datetime('now') WHERE _id = ?"
    ).bind(status, ticketId).run();

    return jsonResponse({ message: "Ticket status updated" });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return jsonResponse({ error: "Failed to update ticket status" }, 500);
  }
}

// POST /api/admin/support/:id/reply
async function handleAdminTicketReply(ticketId: string, request: Request, env: Env): Promise<Response> {
  const admin = await getAdminUser(request, env, 'admin');
  if (!admin) {
    return jsonResponse({ error: "Unauthorized - admin access required" }, 401);
  }

  const body = await request.json() as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return jsonResponse({ error: "Content is required" }, 400);
  }

  try {
    const messageId = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO support_messages (_id, ticket_id, sender_type, sender_id, content, date_created)
      VALUES (?, ?, 'admin', ?, ?, datetime('now'))
    `).bind(messageId, ticketId, admin.id, content).run();

    // Update ticket status to pending and timestamp
    await env.DB.prepare(
      "UPDATE support_tickets SET status = 'pending', date_modified = datetime('now') WHERE _id = ?"
    ).bind(ticketId).run();

    return jsonResponse({
      message: "Reply sent",
      messageId,
    });
  } catch (error) {
    console.error("Send reply error:", error);
    return jsonResponse({ error: "Failed to send reply" }, 500);
  }
}
