import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://nhimbe.com",
  "https://www.nhimbe.com",
];

export function corsMiddleware() {
  const extraOrigin = process.env.ALLOWED_ORIGIN;
  const origins = extraOrigin
    ? [...ALLOWED_ORIGINS, extraOrigin]
    : ALLOWED_ORIGINS;

  return cors({
    origin: origins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true,
  });
}
