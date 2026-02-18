import { Hono } from "hono";
import type { Env } from "../types";

const VERSION = "0.2.0";

export const health = new Hono<{ Bindings: Env }>();

// Root endpoint - Status Page or JSON
health.get("/", (c) => {
  const accept = c.req.header("Accept") || "";
  if (accept.includes("application/json")) {
    return c.json({
      name: "nhimbe API",
      version: VERSION,
      status: "healthy",
      environment: c.env.ENVIRONMENT,
      features: ["events", "search", "ai-assistant", "recommendations"],
    });
  }
  return statusPage(c.env);
});

// Health check
health.get("/api/health", async (c) => {
  const probes: Record<string, { ok: boolean; latencyMs: number }> = {};

  // Probe D1
  const dbStart = Date.now();
  try {
    await c.env.DB.prepare("SELECT 1").first();
    probes.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch {
    probes.database = { ok: false, latencyMs: Date.now() - dbStart };
  }

  // Probe KV
  const kvStart = Date.now();
  try {
    await c.env.CACHE.get("__health_check__");
    probes.cache = { ok: true, latencyMs: Date.now() - kvStart };
  } catch {
    probes.cache = { ok: false, latencyMs: Date.now() - kvStart };
  }

  // Binding presence checks (can't probe without actual work)
  probes.ai = { ok: !!c.env.AI, latencyMs: 0 };
  probes.vectorize = { ok: !!c.env.VECTORIZE, latencyMs: 0 };

  const allOk = Object.values(probes).every((p) => p.ok);

  return c.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: probes,
  });
});

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
