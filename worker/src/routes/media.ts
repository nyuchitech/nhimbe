import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { safeParseInt } from "../utils/validation";
import { generateId } from "../utils/ids";
import { corsHeaders } from "../utils/response";

export const media = new Hono<{ Bindings: Env }>();
media.use("*", writeAuth);

// POST /api/media/upload
media.post("/upload", async (c) => {
  const contentType = c.req.header("Content-Type") || "";

  if (!contentType.startsWith("image/")) {
    return c.json({ error: "Content-Type must be an image type" }, 400);
  }

  const key = `events/${generateId()}.${contentType.split("/")[1]}`;
  const body = await c.req.raw.arrayBuffer();

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
