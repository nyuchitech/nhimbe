/**
 * nhimbe API - Cloudflare Workers
 * Events platform with AI-powered search and recommendations
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
      // Root endpoint
      if (url.pathname === "/") {
        return jsonResponse({
          name: "nhimbe API",
          version: "0.2.0",
          status: "healthy",
          environment: env.ENVIRONMENT,
          features: ["events", "search", "ai-assistant", "recommendations"],
        });
      }

      // Health check
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
