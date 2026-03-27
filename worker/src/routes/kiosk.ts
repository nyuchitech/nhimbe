import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { getAuthenticatedUser } from "../auth/stytch";

export const kiosk = new Hono<{ Bindings: Env }>();

const PAIRING_TTL_SECONDS = 300; // 5 minutes for code to be claimed
const SESSION_TTL_SECONDS = 86400; // 24 hours for paired session

type ScreenType = "kiosk" | "signage-host" | "signage-admin";

const VALID_SCREEN_TYPES: ScreenType[] = ["kiosk", "signage-host", "signage-admin"];

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 for readability
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function expiresAt(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

// Cleanup expired pairings/sessions (best-effort, runs on each request)
async function cleanupExpired(db: Env["DB"]) {
  const now = new Date().toISOString();
  await db.prepare("DELETE FROM kiosk_pairings WHERE expires_at < ?").bind(now).run();
  await db.prepare("DELETE FROM kiosk_sessions WHERE expires_at < ?").bind(now).run();
}

// POST /api/kiosk/pair/request — Screen requests a pairing code
kiosk.post("/pair/request", async (c) => {
  const db = c.env.DB;
  const body = await c.req.json().catch(() => ({})) as { screenType?: string };
  const screenType = VALID_SCREEN_TYPES.includes(body.screenType as ScreenType)
    ? (body.screenType as ScreenType)
    : "kiosk";

  // Best-effort cleanup of expired entries
  cleanupExpired(db).catch(() => {});

  const code = generatePairingCode();
  const expires = expiresAt(PAIRING_TTL_SECONDS);

  await db.prepare(
    "INSERT OR REPLACE INTO kiosk_pairings (code, status, screen_type, expires_at) VALUES (?, 'pending', ?, ?)"
  ).bind(code, screenType, expires).run();

  return c.json({ code, expiresIn: PAIRING_TTL_SECONDS, screenType });
});

// GET /api/kiosk/pair/:code/status — Screen polls for pairing confirmation
kiosk.get("/pair/:code/status", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const now = new Date().toISOString();

  const row = await c.env.DB.prepare(
    "SELECT status, screen_type, event_id, event_name, host_name, session_token FROM kiosk_pairings WHERE code = ? AND expires_at > ?"
  ).bind(code, now).first() as {
    status: string;
    screen_type: string;
    event_id: string | null;
    event_name: string | null;
    host_name: string | null;
    session_token: string | null;
  } | null;

  if (!row) {
    return c.json({ status: "expired" });
  }

  return c.json({
    status: row.status,
    screenType: row.screen_type,
    eventId: row.event_id || undefined,
    eventName: row.event_name || undefined,
    hostName: row.host_name || undefined,
    sessionToken: row.session_token || undefined,
  });
});

// POST /api/kiosk/pair/:code/confirm — Host confirms pairing (requires auth)
kiosk.post("/pair/:code/confirm", writeAuth, async (c) => {
  const code = c.req.param("code").toUpperCase();
  const body = await c.req.json() as { eventId: string };
  const db = c.env.DB;

  if (!body.eventId) {
    return c.json({ error: "eventId is required" }, 400);
  }

  const now = new Date().toISOString();

  // Check the pairing code exists and is pending
  const pairing = await db.prepare(
    "SELECT code, status, screen_type FROM kiosk_pairings WHERE code = ? AND expires_at > ?"
  ).bind(code, now).first() as { code: string; status: string; screen_type: string } | null;

  if (!pairing) {
    return c.json({ error: "Pairing code expired or invalid" }, 404);
  }

  if (pairing.status !== "pending") {
    return c.json({ error: "Code already used" }, 409);
  }

  // Get event details
  const event = await db.prepare(
    "SELECT _id, name, organizer_identifier, organizer_name FROM events WHERE _id = ?"
  ).bind(body.eventId).first() as {
    _id: string;
    name: string;
    organizer_identifier: string;
    organizer_name: string;
  } | null;

  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }

  // Get host info
  const authResult = await getAuthenticatedUser(c.req.raw, c.env);
  const hostId = authResult.user ? authResult.user.userId : null;
  const hostName = event.organizer_name;

  // Generate session token
  const sessionToken = generateSessionToken();
  const sessionExpires = expiresAt(SESSION_TTL_SECONDS);

  // Update pairing + create session in a batch
  await db.batch([
    db.prepare(
      "UPDATE kiosk_pairings SET status = 'confirmed', event_id = ?, event_name = ?, host_id = ?, host_name = ?, session_token = ? WHERE code = ?"
    ).bind(event._id, event.name, hostId, hostName, sessionToken, code),
    db.prepare(
      "INSERT INTO kiosk_sessions (token, event_id, event_name, screen_type, host_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(sessionToken, event._id, event.name, pairing.screen_type, hostId, sessionExpires),
  ]);

  return c.json({
    message: "Screen paired successfully",
    eventName: event.name,
    screenType: pairing.screen_type,
    sessionToken,
  });
});

// GET /api/kiosk/session/:token — Validate a kiosk/signage session
kiosk.get("/session/:token", async (c) => {
  const token = c.req.param("token");
  const now = new Date().toISOString();

  const session = await c.env.DB.prepare(
    "SELECT event_id, event_name, screen_type, host_id, paired_at FROM kiosk_sessions WHERE token = ? AND expires_at > ?"
  ).bind(token, now).first() as {
    event_id: string;
    event_name: string;
    screen_type: string;
    host_id: string | null;
    paired_at: string;
  } | null;

  if (!session) {
    return c.json({ error: "Session expired or invalid" }, 401);
  }

  return c.json({
    session: {
      eventId: session.event_id,
      eventName: session.event_name,
      screenType: session.screen_type,
      hostId: session.host_id,
      pairedAt: session.paired_at,
    },
  });
});

// DELETE /api/kiosk/session/:token — End a kiosk/signage session
kiosk.delete("/session/:token", writeAuth, async (c) => {
  const token = c.req.param("token");
  await c.env.DB.prepare("DELETE FROM kiosk_sessions WHERE token = ?").bind(token).run();
  return c.json({ message: "Session ended" });
});
