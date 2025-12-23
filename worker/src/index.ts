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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

      // Events endpoints
      if (url.pathname.startsWith("/api/events")) {
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

      // Admin: Index events
      if (url.pathname === "/api/admin/index-events") {
        return handleIndexEvents(request, env);
      }

      // Users endpoints
      if (url.pathname.startsWith("/api/users")) {
        return handleUsers(request, url, env);
      }

      // Registrations endpoints
      if (url.pathname.startsWith("/api/registrations")) {
        return handleRegistrations(request, url, env);
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
  ];

  const endpoints = [
    { method: "GET", path: "/api/health", description: "Health check" },
    { method: "GET", path: "/api/events", description: "List events" },
    { method: "GET", path: "/api/events/:id", description: "Get event by ID" },
    { method: "POST", path: "/api/events", description: "Create event" },
    { method: "PUT", path: "/api/events/:id", description: "Update event" },
    { method: "DELETE", path: "/api/events/:id", description: "Delete event" },
    { method: "POST", path: "/api/search", description: "AI-powered semantic search" },
    { method: "POST", path: "/api/assistant", description: "AI chat assistant" },
    { method: "GET", path: "/api/recommendations", description: "Get recommendations" },
    { method: "GET", path: "/api/similar/:id", description: "Find similar events" },
    { method: "GET", path: "/api/users/:id", description: "Get user" },
    { method: "POST", path: "/api/users", description: "Create user" },
    { method: "GET", path: "/api/registrations", description: "List registrations" },
    { method: "POST", path: "/api/registrations", description: "Register for event" },
  ];

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

    <div class="card">
      <div class="card-header">
        <div class="card-icon">📡</div>
        <h2 class="card-title">API Endpoints</h2>
      </div>
      <div class="endpoints-list">
        ${endpoints
          .map(
            (e) => `
          <div class="endpoint">
            <span class="method ${e.method.toLowerCase()}">${e.method}</span>
            <span class="path">${e.path}</span>
            <span class="endpoint-desc">${e.description}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-icon">🤖</div>
        <h2 class="card-title">AI Features</h2>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        This API is powered by Cloudflare Workers AI for intelligent event discovery.
      </p>
      <div class="services-grid">
        <div class="service">
          <div class="service-header">
            <span class="service-name">Semantic Search</span>
          </div>
          <span class="service-desc">Natural language event search using RAG</span>
        </div>
        <div class="service">
          <div class="service-header">
            <span class="service-name">AI Assistant</span>
          </div>
          <span class="service-desc">Conversational event discovery</span>
        </div>
        <div class="service">
          <div class="service-header">
            <span class="service-name">Recommendations</span>
          </div>
          <span class="service-desc">Personalized event suggestions</span>
        </div>
        <div class="service">
          <div class="service-header">
            <span class="service-name">Similar Events</span>
          </div>
          <span class="service-desc">Find related gatherings</span>
        </div>
      </div>
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

  // DELETE /api/registrations/:id - Cancel registration
  const regIdMatch = url.pathname.match(/^\/api\/registrations\/([^/]+)$/);
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
