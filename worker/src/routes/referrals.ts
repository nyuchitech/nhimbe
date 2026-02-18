import { Hono } from "hono";
import type { Env } from "../types";
import { generateId } from "../utils/ids";

export const referrals = new Hono<{ Bindings: Env }>();

// POST /api/referrals/track
referrals.post("/track", async (c) => {
  const body = await c.req.json() as {
    eventId: string;
    referralCode: string;
    referredUserId?: string;
  };

  if (!body.eventId || !body.referralCode) {
    return c.json({ error: "eventId and referralCode required" }, 400);
  }

  interface CodeRow {
    user_id: string;
  }
  const codeResult = await c.env.DB.prepare(
    "SELECT user_id FROM user_referral_codes WHERE code = ?"
  ).bind(body.referralCode).first() as CodeRow | null;

  if (!codeResult) {
    return c.json({ error: "Invalid referral code" }, 404);
  }

  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO referrals (id, event_id, referrer_user_id, referred_user_id, referral_code, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.eventId,
    codeResult.user_id,
    body.referredUserId || null,
    body.referralCode,
    body.referredUserId ? "converted" : "pending"
  ).run();

  if (c.env.ANALYTICS_QUEUE) {
    await c.env.ANALYTICS_QUEUE.send({
      type: "referral",
      eventId: body.eventId,
      userId: codeResult.user_id,
      data: { referralCode: body.referralCode, converted: !!body.referredUserId },
      timestamp: new Date().toISOString(),
    });
  }

  return c.json({ id, message: "Referral tracked" }, 201);
});
