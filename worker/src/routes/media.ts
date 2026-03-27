import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { safeParseInt } from "../utils/validation";
import { generateId } from "../utils/ids";
import { corsHeaders } from "../utils/response";

export const media = new Hono<{ Bindings: Env }>();
media.use("*", writeAuth);

// POST /api/media/upload
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

media.post("/upload", async (c) => {
  const contentType = c.req.header("Content-Type") || "";

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return c.json({ error: "Content-Type must be one of: image/jpeg, image/png, image/webp, image/gif" }, 400);
  }

  // Check Content-Length before reading body to prevent DoS
  const contentLength = parseInt(c.req.header("Content-Length") || "0", 10);
  if (contentLength > MAX_UPLOAD_SIZE) {
    return c.json({ error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` }, 413);
  }

  const key = `events/${generateId()}.${contentType.split("/")[1]}`;
  const body = await c.req.raw.arrayBuffer();

  // Also check actual body size (Content-Length can be spoofed)
  if (body.byteLength > MAX_UPLOAD_SIZE) {
    return c.json({ error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` }, 413);
  }

  await c.env.MEDIA.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
    },
  });

  return c.json({
    key,
    url: `/api/media/${key}`,
    message: "Upload successful",
  }, 201);
});

// GET /api/media/:key{.+} - Serve image with optional transformations
media.get("/*", async (c) => {
  const key = c.req.path.replace("/", "");
  const object = await c.env.MEDIA.get(key);

  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const widthParam = c.req.query("w");
  const heightParam = c.req.query("h");
  const width = widthParam ? safeParseInt(widthParam, 0, 1, 4000) : undefined;
  const height = heightParam ? safeParseInt(heightParam, 0, 1, 4000) : undefined;
  const formatParam = c.req.query("format");
  const format = ["webp", "avif", "jpeg", "png"].includes(formatParam || "") ? formatParam as "webp" | "avif" | "jpeg" | "png" : null;

  if ((width || height || format) && c.env.IMAGES) {
    const transformed = c.env.IMAGES
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

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
      "ETag": object.httpEtag,
      ...corsHeaders,
    },
  });
});

// DELETE /api/media/:key{.+}
media.delete("/*", async (c) => {
  const key = c.req.path.replace("/", "");
  await c.env.MEDIA.delete(key);
  return c.json({ message: "File deleted" });
});
