import { createMiddleware } from "hono/factory";
import type { Env, UserRole } from "../types";
import { hasPermission } from "../types";
import { getAuthenticatedUser } from "../auth/stytch";

// Trusted domains — always allow these and all their subdomains
const TRUSTED_DOMAINS = ["nyuchi.com", "mukoko.com", "nhimbe.com"];

// Check if request origin is allowed
export function isAllowedOrigin(request: Request, env: Env): boolean {
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
}

// Validate API key from request (timing-safe comparison)
export function validateApiKey(request: Request, env: Env): boolean {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!apiKey || !env.API_KEY) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(apiKey);
  const b = encoder.encode(env.API_KEY);

  if (a.byteLength !== b.byteLength) return false;

  return crypto.subtle.timingSafeEqual(a, b);
}

// Middleware: require API key or allowed origin for write operations
export const writeAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (["POST", "PUT", "DELETE"].includes(c.req.method)) {
    if (!validateApiKey(c.req.raw, c.env) && !isAllowedOrigin(c.req.raw, c.env)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
  await next();
});

// Middleware: require API key (admin endpoints)
export const apiKeyRequired = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (!validateApiKey(c.req.raw, c.env)) {
    return c.json({ error: "Unauthorized - API key required" }, 401);
  }
  await next();
});

// Helper: get authenticated admin user with role check (not middleware — used inline)
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function getAdminUser(request: Request, env: Env, requiredRole: UserRole): Promise<AdminUser | null> {
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
    "SELECT _id, email, name, role FROM users WHERE stytch_user_id = ?"
  ).bind(stytchUser.userId).first() as DbUserRow | null;

  if (!user) return null;

  const userRole = (user.role || "user") as UserRole;
  if (!hasPermission(userRole, requiredRole)) return null;

  return { id: user._id, email: user.email, name: user.name, role: userRole };
}
