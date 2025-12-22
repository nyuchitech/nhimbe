export interface Env {
  ENVIRONMENT: string;
  // D1 Database (uncomment when ready)
  // DB: D1Database;
  // KV Namespace (uncomment when ready)
  // CACHE: KVNamespace;
}

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

    // API Routes
    if (url.pathname === "/") {
      return jsonResponse({
        name: "nhimbe API",
        version: "0.1.0",
        status: "healthy",
        environment: env.ENVIRONMENT,
      });
    }

    if (url.pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    // Events endpoints (placeholder)
    if (url.pathname.startsWith("/api/events")) {
      return handleEvents(request, url);
    }

    // 404 for unknown routes
    return jsonResponse({ error: "Not Found" }, 404);
  },
};

export default worker;

async function handleEvents(request: Request, url: URL): Promise<Response> {
  const method = request.method;

  if (url.pathname === "/api/events" && method === "GET") {
    // TODO: Fetch events from D1 database
    return jsonResponse({
      events: [],
      message: "Events endpoint ready. Database integration pending.",
    });
  }

  if (url.pathname === "/api/events" && method === "POST") {
    // TODO: Create event in D1 database
    return jsonResponse(
      { message: "Event creation endpoint ready. Database integration pending." },
      201
    );
  }

  return jsonResponse({ error: "Not Found" }, 404);
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
