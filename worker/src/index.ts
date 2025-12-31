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
} from "./types";
import { searchEvents, findSimilarEvents, getRecommendations } from "./ai/search";
import { chat, generateSuggestions } from "./ai/assistant";
import { indexEvent, indexEvents, removeEventFromIndex } from "./ai/embeddings";

const VERSION = "0.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

// Validate API key from request
function validateApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");
  return apiKey === env.API_KEY;
}

// Check if request is from allowed origin (frontend)
function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = [
    "http://localhost:3000",
    "https://nhimbe.com",
    "https://www.nhimbe.com",
    env.ALLOWED_ORIGIN,
  ].filter(Boolean);
  return allowedOrigins.some(allowed => origin.startsWith(allowed as string));
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);

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

      // AI Search endpoint
      if (url.pathname === "/api/search") {
        return handleSearch(request, env);
      }

      // AI Assistant endpoint
      if (url.pathname === "/api/assistant") {
        return handleAssistant(request, env);
      }

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

      // 404 for unknown routes
      return jsonResponse({ error: "Not Found" }, 404);
    } catch (error) {
      console.error("API Error:", error);
      return jsonResponse(
        {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  },
};

export default worker;

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
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = "SELECT * FROM events WHERE is_published = TRUE AND is_cancelled = FALSE";
    const params: unknown[] = [];

    if (city) {
      query += " AND location_city = ?";
      params.push(city);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    query += " ORDER BY date_iso ASC LIMIT ? OFFSET ?";
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

    const result = await env.DB.prepare("SELECT * FROM events WHERE id = ? OR slug = ? OR short_code = ?")
      .bind(eventId, eventId, eventId)
      .first();

    if (!result) {
      return jsonResponse({ error: "Event not found" }, 404);
    }

    return jsonResponse({ event: dbRowToEvent(result as Record<string, unknown>) });
  }

  // POST /api/events - Create event
  if (url.pathname === "/api/events" && method === "POST") {
    const body = await request.json() as Partial<Event>;

    // Generate IDs
    const id = body.id || generateId();
    const shortCode = body.shortCode || generateShortCode();
    const slug = body.slug || slugify(body.title || "");

    // Insert into database
    await env.DB.prepare(`
      INSERT INTO events (
        id, short_code, slug, title, description,
        date_day, date_month, date_full, date_time, date_iso,
        location_venue, location_address, location_city, location_country,
        category, tags, cover_image, cover_gradient,
        attendee_count, capacity, is_online,
        host_name, host_handle, host_initials, host_event_count,
        price_amount, price_currency, price_label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      shortCode,
      slug,
      body.title,
      body.description,
      body.date?.day,
      body.date?.month,
      body.date?.full,
      body.date?.time,
      body.date?.iso,
      body.location?.venue,
      body.location?.address,
      body.location?.city,
      body.location?.country,
      body.category,
      JSON.stringify(body.tags || []),
      body.coverImage,
      body.coverGradient,
      body.attendeeCount || 0,
      body.capacity,
      body.isOnline || false,
      body.host?.name,
      body.host?.handle,
      body.host?.initials,
      body.host?.eventCount || 0,
      body.price?.amount,
      body.price?.currency,
      body.price?.label
    ).run();

    // Index in Vectorize for search
    const event: Event = {
      id,
      shortCode,
      slug,
      title: body.title || "",
      description: body.description || "",
      date: body.date!,
      location: body.location!,
      category: body.category || "",
      tags: body.tags || [],
      coverImage: body.coverImage,
      coverGradient: body.coverGradient,
      attendeeCount: body.attendeeCount || 0,
      capacity: body.capacity,
      isOnline: body.isOnline,
      host: body.host!,
      price: body.price,
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

    if (body.title) { updates.push("title = ?"); params.push(body.title); }
    if (body.description) { updates.push("description = ?"); params.push(body.description); }
    if (body.category) { updates.push("category = ?"); params.push(body.category); }
    if (body.tags) { updates.push("tags = ?"); params.push(JSON.stringify(body.tags)); }
    // Add more fields as needed...

    updates.push("updated_at = datetime('now')");
    params.push(eventId);

    await env.DB.prepare(
      `UPDATE events SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...params).run();

    // Re-index in Vectorize
    const result = await env.DB.prepare("SELECT * FROM events WHERE id = ?")
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

    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
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
      "SELECT * FROM users WHERE id = ? OR handle = ?"
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
      INSERT INTO users (id, email, name, handle, city, country, interests)
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
        "SELECT * FROM registrations WHERE event_id = ?"
      ).bind(eventId).all();
      return jsonResponse({ registrations: result.results });
    }

    if (userId) {
      const result = await env.DB.prepare(
        "SELECT * FROM registrations WHERE user_id = ?"
      ).bind(userId).all();
      return jsonResponse({ registrations: result.results });
    }

    return jsonResponse({ error: "event_id or user_id required" }, 400);
  }

  // POST /api/registrations - Register for event
  if (url.pathname === "/api/registrations" && method === "POST") {
    const body = await request.json() as Record<string, unknown>;
    const id = generateId();

    await env.DB.prepare(`
      INSERT INTO registrations (id, event_id, user_id, ticket_type, ticket_price, ticket_currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.event_id,
      body.user_id,
      body.ticket_type,
      body.ticket_price,
      body.ticket_currency
    ).run();

    // Update attendee count
    await env.DB.prepare(
      "UPDATE events SET attendee_count = attendee_count + 1 WHERE id = ?"
    ).bind(body.event_id).run();

    return jsonResponse({ id, message: "Registration successful" }, 201);
  }

  // PUT /api/registrations/:id - Update registration status (approve/reject)
  const regIdMatch = url.pathname.match(/^\/api\/registrations\/([^/]+)$/);
  if (regIdMatch && method === "PUT") {
    const regId = regIdMatch[1];
    const body = await request.json() as { status: string };

    if (!body.status || !["approved", "rejected", "pending", "registered"].includes(body.status)) {
      return jsonResponse({ error: "Invalid status. Must be: approved, rejected, pending, or registered" }, 400);
    }

    await env.DB.prepare(
      "UPDATE registrations SET status = ? WHERE id = ?"
    ).bind(body.status, regId).run();

    return jsonResponse({ message: `Registration ${body.status}` });
  }

  // DELETE /api/registrations/:id - Cancel registration
  if (regIdMatch && method === "DELETE") {
    const regId = regIdMatch[1];

    // Get registration to find event
    const reg = await env.DB.prepare(
      "SELECT * FROM registrations WHERE id = ?"
    ).bind(regId).first() as { event_id: string } | null;

    if (reg) {
      await env.DB.prepare(
        "UPDATE registrations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
      ).bind(regId).run();

      // Update attendee count
      await env.DB.prepare(
        "UPDATE events SET attendee_count = attendee_count - 1 WHERE id = ?"
      ).bind(reg.event_id).run();
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

    // Check for transformation params
    const width = url.searchParams.get("w");
    const height = url.searchParams.get("h");
    const format = url.searchParams.get("format") as "webp" | "avif" | "jpeg" | "png" | null;

    // If transformations requested and Images binding available
    if ((width || height || format) && env.IMAGES) {
      const transformed = env.IMAGES
        .input(object.body)
        .transform({
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
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
  const categories = [
    "Tech",
    "Culture",
    "Wellness",
    "Social",
    "Professional",
    "Music",
    "Food & Drink",
    "Sports",
    "Community",
    "Education",
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
      id: "african-tech-summit-2025",
      short_code: "aTs25xKp",
      slug: "african-tech-summit-2025",
      title: "African Tech Summit 2025",
      description: "Join us for the biggest tech gathering in Zimbabwe! The African Tech Summit brings together innovators, entrepreneurs, investors, and tech enthusiasts from across the continent.\n\nThis year's theme: \"Building Africa's Digital Future\"\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "28",
      date_month: "Dec",
      date_full: "Saturday, December 28, 2025",
      date_time: "9:00 AM - 6:00 PM (CAT)",
      date_iso: "2025-12-28T09:00:00+02:00",
      location_venue: "Rainbow Towers Hotel",
      location_address: "Pennefather Ave",
      location_city: "Harare",
      location_country: "Zimbabwe",
      category: "Tech",
      tags: JSON.stringify(["startup", "innovation", "networking", "AI", "fintech", "sample"]),
      cover_image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      attendee_count: 247,
      capacity: 500,
      host_name: "Zimbabwe Tech Hub",
      host_handle: "@zimtechhub",
      host_initials: "ZT",
      host_event_count: 12,
      price_amount: 25,
      price_currency: "USD",
      price_label: "Early Bird Ticket",
    },
    {
      id: "amapiano-night-nye",
      short_code: "nYe31vFx",
      slug: "amapiano-night-nye-edition",
      title: "Amapiano Night: NYE Edition",
      description: "Ring in the new year with the best Amapiano beats! Live DJs, great vibes, and an unforgettable night at Victoria Falls.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "31",
      date_month: "Dec",
      date_full: "Tuesday, December 31, 2025",
      date_time: "8:00 PM - 4:00 AM (CAT)",
      date_iso: "2025-12-31T20:00:00+02:00",
      location_venue: "The Venue",
      location_address: "Park Way Drive",
      location_city: "Victoria Falls",
      location_country: "Zimbabwe",
      category: "Music",
      tags: JSON.stringify(["amapiano", "nye", "party", "dj", "dance", "sample"]),
      cover_image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
      attendee_count: 89,
      capacity: 200,
      host_name: "Vic Falls Events",
      host_handle: "@vicfallsevents",
      host_initials: "VF",
      host_event_count: 24,
      price_amount: 50,
      price_currency: "USD",
      price_label: "General Admission",
    },
    {
      id: "sunrise-yoga-chivero",
      short_code: "yGa15hRm",
      slug: "sunrise-yoga-lake-chivero",
      title: "Sunrise Yoga at Lake Chivero",
      description: "Start your day with peace and tranquility. Join us for a sunrise yoga session overlooking the beautiful Lake Chivero. All levels welcome. Mats provided.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "15",
      date_month: "Jan",
      date_full: "Wednesday, January 15, 2025",
      date_time: "5:30 AM - 7:30 AM (CAT)",
      date_iso: "2025-01-15T05:30:00+02:00",
      location_venue: "Lake Chivero Recreational Park",
      location_address: "Lake Chivero",
      location_city: "Harare",
      location_country: "Zimbabwe",
      category: "Wellness",
      tags: JSON.stringify(["yoga", "meditation", "nature", "fitness", "mindfulness", "sample"]),
      cover_gradient: "linear-gradient(135deg, #4B0082, #004D40)",
      attendee_count: 32,
      capacity: 50,
      host_name: "Harare Wellness",
      host_handle: "@hararewellness",
      host_initials: "HW",
      host_event_count: 8,
    },
    {
      id: "startup-founders-meetup",
      short_code: "sFm24kLp",
      slug: "startup-founders-meetup-harare",
      title: "Startup Founders Meetup",
      description: "Connect with fellow founders, share your journey, and learn from each other. Casual networking in a relaxed environment. Refreshments provided.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "24",
      date_month: "Dec",
      date_full: "Tuesday, December 24, 2025",
      date_time: "6:00 PM - 9:00 PM (CAT)",
      date_iso: "2025-12-24T18:00:00+02:00",
      location_venue: "Impact Hub",
      location_address: "16 Cork Road, Avondale",
      location_city: "Harare",
      location_country: "Zimbabwe",
      category: "Professional",
      tags: JSON.stringify(["startup", "founders", "networking", "entrepreneurship", "sample"]),
      cover_gradient: "linear-gradient(135deg, #004D40, #00796B)",
      attendee_count: 45,
      capacity: 60,
      host_name: "Impact Hub Harare",
      host_handle: "@impactharare",
      host_initials: "IH",
      host_event_count: 32,
    },
    {
      id: "poetry-wine-evening",
      short_code: "pWe27bNx",
      slug: "poetry-wine-evening-book-cafe",
      title: "Poetry & Wine Evening",
      description: "An intimate evening of spoken word, poetry readings, and fine wine. Share your work or simply enjoy the art. Open mic available.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "27",
      date_month: "Dec",
      date_full: "Friday, December 27, 2025",
      date_time: "7:00 PM - 10:00 PM (CAT)",
      date_iso: "2025-12-27T19:00:00+02:00",
      location_venue: "Book Café",
      location_address: "Fife Avenue",
      location_city: "Harare",
      location_country: "Zimbabwe",
      category: "Culture",
      tags: JSON.stringify(["poetry", "spoken-word", "wine", "art", "literature", "sample"]),
      cover_gradient: "linear-gradient(135deg, #4B0082, #7B1FA2)",
      attendee_count: 28,
      capacity: 40,
      host_name: "Book Café",
      host_handle: "@bookcafeharare",
      host_initials: "BC",
      host_event_count: 56,
    },
    {
      id: "community-cleanup-borrowdale",
      short_code: "cCb28qWz",
      slug: "community-cleanup-borrowdale",
      title: "Community Clean-Up: Borrowdale",
      description: "Join your neighbors in keeping Borrowdale beautiful. Gloves and bags provided. Coffee and snacks after! Bring the whole family.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "28",
      date_month: "Dec",
      date_full: "Saturday, December 28, 2025",
      date_time: "7:00 AM - 11:00 AM (CAT)",
      date_iso: "2025-12-28T07:00:00+02:00",
      location_venue: "Borrowdale Park",
      location_address: "Borrowdale Road",
      location_city: "Harare",
      location_country: "Zimbabwe",
      category: "Community",
      tags: JSON.stringify(["volunteer", "environment", "cleanup", "community-service", "sample"]),
      cover_gradient: "linear-gradient(135deg, #5D4037, #8D6E63)",
      attendee_count: 67,
      capacity: 100,
      host_name: "Borrowdale Residents",
      host_handle: "@borrowdalera",
      host_initials: "BR",
      host_event_count: 6,
    },
    {
      id: "jozi-tech-meetup",
      short_code: "jTm15xRk",
      slug: "johannesburg-tech-meetup",
      title: "Joburg Tech & Startups Meetup",
      description: "Monthly gathering of Johannesburg's tech community. Lightning talks, networking, and drinks. All welcome!\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "20",
      date_month: "Jan",
      date_full: "Monday, January 20, 2025",
      date_time: "6:00 PM - 9:00 PM (SAST)",
      date_iso: "2025-01-20T18:00:00+02:00",
      location_venue: "Workshop17",
      location_address: "Sandton City",
      location_city: "Johannesburg",
      location_country: "South Africa",
      category: "Tech",
      tags: JSON.stringify(["startup", "tech", "networking", "south-africa", "sample"]),
      cover_gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
      attendee_count: 156,
      capacity: 200,
      host_name: "Jozi Tech Community",
      host_handle: "@jozitech",
      host_initials: "JT",
      host_event_count: 48,
    },
    {
      id: "nairobi-design-week",
      short_code: "nDw10pLm",
      slug: "nairobi-design-week-2025",
      title: "Nairobi Design Week 2025",
      description: "East Africa's largest design festival. Exhibitions, workshops, talks, and networking with creatives from across the continent.\n\n⚠️ This is sample data for demonstration purposes.",
      date_day: "10",
      date_month: "Feb",
      date_full: "Monday, February 10, 2025",
      date_time: "10:00 AM - 6:00 PM (EAT)",
      date_iso: "2025-02-10T10:00:00+03:00",
      location_venue: "Nairobi National Museum",
      location_address: "Museum Hill",
      location_city: "Nairobi",
      location_country: "Kenya",
      category: "Culture",
      tags: JSON.stringify(["design", "art", "exhibition", "creative", "kenya", "sample"]),
      cover_image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      attendee_count: 320,
      capacity: 500,
      host_name: "Nairobi Design Week",
      host_handle: "@nairobidesign",
      host_initials: "ND",
      host_event_count: 5,
      price_amount: 20,
      price_currency: "USD",
      price_label: "Day Pass",
    },
  ];

  let inserted = 0;
  let errors = 0;

  for (const event of sampleEvents) {
    try {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO events (
          id, short_code, slug, title, description,
          date_day, date_month, date_full, date_time, date_iso,
          location_venue, location_address, location_city, location_country,
          category, tags, cover_image, cover_gradient,
          attendee_count, capacity, is_online,
          host_name, host_handle, host_initials, host_event_count,
          price_amount, price_currency, price_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.id,
        event.short_code,
        event.slug,
        event.title,
        event.description,
        event.date_day,
        event.date_month,
        event.date_full,
        event.date_time,
        event.date_iso,
        event.location_venue,
        event.location_address,
        event.location_city,
        event.location_country,
        event.category,
        event.tags,
        event.cover_image || null,
        event.cover_gradient || null,
        event.attendee_count,
        event.capacity || null,
        false,
        event.host_name,
        event.host_handle,
        event.host_initials,
        event.host_event_count,
        event.price_amount || null,
        event.price_currency || null,
        event.price_label || null
      ).run();
      inserted++;
    } catch (e) {
      console.error(`Error inserting ${event.id}:`, e);
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
// Utility Functions
// ============================================

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
  return {
    id: row.id as string,
    shortCode: row.short_code as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    date: {
      day: row.date_day as string,
      month: row.date_month as string,
      full: row.date_full as string,
      time: row.date_time as string,
      iso: row.date_iso as string,
    },
    location: {
      venue: row.location_venue as string,
      address: row.location_address as string,
      city: row.location_city as string,
      country: row.location_country as string,
    },
    category: row.category as string,
    tags: JSON.parse((row.tags as string) || "[]"),
    coverImage: row.cover_image as string | undefined,
    coverGradient: row.cover_gradient as string | undefined,
    attendeeCount: row.attendee_count as number,
    friendsCount: row.friends_count as number | undefined,
    capacity: row.capacity as number | undefined,
    isOnline: row.is_online as boolean | undefined,
    host: {
      name: row.host_name as string,
      handle: row.host_handle as string,
      initials: row.host_initials as string,
      eventCount: row.host_event_count as number,
    },
    price: row.price_amount
      ? {
          amount: row.price_amount as number,
          currency: row.price_currency as string,
          label: row.price_label as string,
        }
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
