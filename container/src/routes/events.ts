/**
 * Event routes — MongoDB-backed, schema.org field names.
 */

import { Hono } from "hono";
import type { AppVariables } from "../types.js";
import type { SchemaEvent, AnalyticsEvent } from "../schema.js";
import { events as eventsCol, persons, registrations, analyticsEvents } from "../mongodb.js";
import { buildEventDocument, safeParseInt, generateId } from "../utils.js";
import { requireAuth } from "../middleware/auth.js";

const router = new Hono<{ Variables: AppVariables }>();

// ── GET / — List events ─────────────────────────────────────────────
router.get("/", async (c) => {
  const mongo = c.get("mongodb");
  const url = new URL(c.req.url);
  const city = url.searchParams.get("city");
  const category = url.searchParams.get("category");
  const limit = safeParseInt(url.searchParams.get("limit"), 20, 1, 100);
  const offset = safeParseInt(url.searchParams.get("offset"), 0);

  const filter: Record<string, unknown> = {
    isPublished: true,
    eventStatus: { $ne: "EventCancelled" },
  };
  if (city) filter["location.address.addressLocality"] = city;
  if (category) filter.category = category;

  const col = eventsCol(mongo);
  const [eventsList, total] = await Promise.all([
    col.find(filter).sort({ startDate: 1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return c.json({ events: eventsList, total, limit, offset });
});

// ── GET /trending — Trending events ─────────────────────────────────
router.get("/trending", async (c) => {
  const mongo = c.get("mongodb");
  const limit = safeParseInt(new URL(c.req.url).searchParams.get("limit"), 10, 1, 50);

  const col = eventsCol(mongo);
  const trendingEvents = await col
    .find({ isPublished: true, eventStatus: "EventScheduled" })
    .sort({ attendeeCount: -1, dateCreated: -1 })
    .limit(limit)
    .toArray();

  return c.json({ events: trendingEvents });
});

// ── GET /:id — Single event ─────────────────────────────────────────
router.get("/:id", async (c) => {
  const mongo = c.get("mongodb");
  const id = c.req.param("id");

  const col = eventsCol(mongo);
  const event = await col.findOne({
    $or: [{ _id: id }, { slug: id }, { shortCode: id }],
  });

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  return c.json(event);
});

// ── POST / — Create event ───────────────────────────────────────────
router.post("/", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const userEmail = c.get("userEmail")!;

  const body = await c.req.json();

  if (!body.name || !body.startDate || !body.description) {
    return c.json({ error: "Missing required fields: name, startDate, description" }, 400);
  }

  // Get organizer info
  const user = await persons(mongo).findOne({ _id: userId });
  const organizerName = user?.name || userEmail;
  const organizerHandle = user?.alternateName;

  const event = buildEventDocument(body, userId, organizerName, organizerHandle);

  const col = eventsCol(mongo);
  await col.insertOne(event);

  // Update organizer event count
  if (user) {
    await persons(mongo).updateOne(
      { _id: userId },
      { $inc: { eventsHosted: 1 }, $set: { dateModified: new Date().toISOString() } }
    );
  }

  return c.json({ event, _vectorizeIndex: true }, 201);
});

// ── PUT /:id — Update event ─────────────────────────────────────────
router.put("/:id", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const col = eventsCol(mongo);
  const existing = await col.findOne({ _id: id });
  if (!existing) {
    return c.json({ error: "Event not found" }, 404);
  }

  if (existing.organizer.identifier !== userId) {
    return c.json({ error: "Unauthorized: not the organizer" }, 403);
  }

  const body = await c.req.json();
  const updates: Record<string, unknown> = { dateModified: new Date().toISOString() };

  // Map allowed fields
  const allowedFields = [
    "name", "description", "startDate", "endDate", "category",
    "keywords", "image", "maximumAttendeeCapacity", "coverGradient",
    "themeId", "meetingUrl", "meetingPlatform", "isPublished",
    "eventAttendanceMode", "eventStatus",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Handle location updates
  if (body.locationName || body.streetAddress || body.addressLocality || body.addressCountry) {
    const location = existing.location;
    if (location["@type"] === "Place") {
      if (body.locationName) updates["location.name"] = body.locationName;
      if (body.streetAddress) updates["location.address.streetAddress"] = body.streetAddress;
      if (body.addressLocality) updates["location.address.addressLocality"] = body.addressLocality;
      if (body.addressCountry) updates["location.address.addressCountry"] = body.addressCountry;
    }
  }

  // Handle offers updates
  if (body.price !== undefined || body.priceCurrency || body.ticketUrl) {
    if (body.price === 0 || body.price === null) {
      updates.offers = undefined;
    } else {
      updates.offers = {
        "@type": "Offer",
        price: body.price ?? existing.offers?.price ?? 0,
        priceCurrency: body.priceCurrency ?? existing.offers?.priceCurrency ?? "USD",
        url: body.ticketUrl ?? existing.offers?.url,
        availability: "https://schema.org/InStock",
      };
    }
  }

  // Update dateDisplay if startDate changed
  if (body.startDate) {
    const d = new Date(body.startDate);
    updates.dateDisplay = {
      day: d.getDate().toString(),
      month: d.toLocaleString("en", { month: "long" }),
      full: d.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }),
      time: body.displayTime || d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
    };
  }

  await col.updateOne({ _id: id }, { $set: updates });
  const updated = await col.findOne({ _id: id });

  return c.json({ event: updated, _vectorizeIndex: true });
});

// ── DELETE /:id — Delete event ──────────────────────────────────────
router.delete("/:id", requireAuth(), async (c) => {
  const mongo = c.get("mongodb");
  const userId = c.get("userId")!;
  const userRole = c.get("userRole");
  const id = c.req.param("id");

  const col = eventsCol(mongo);
  const event = await col.findOne({ _id: id });
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  const isOrganizer = event.organizer.identifier === userId;
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  if (!isOrganizer && !isAdmin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  await col.deleteOne({ _id: id });
  await registrations(mongo).deleteMany({ event: id });

  return c.json({ success: true, _vectorizeRemove: id });
});

// ── POST /:id/view — Track event view ──────────────────────────────
router.post("/:id/view", async (c) => {
  const mongo = c.get("mongodb");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  await analyticsEvents(mongo).insertOne({
    _id: generateId(),
    eventType: "view",
    eventId: id,
    userId: (body as Record<string, unknown>).userId as string | undefined,
    source: (((body as Record<string, unknown>).source as string | undefined) || "direct") as AnalyticsEvent["source"],
    dateCreated: new Date().toISOString(),
  });

  return c.json({ success: true });
});

export default router;
