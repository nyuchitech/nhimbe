import { Hono } from "hono";
import type { Env } from "../types";
import { writeAuth } from "../middleware/auth";
import { generateId } from "../utils/ids";
import { PaynowProvider } from "../payments/paynow";

export const payments = new Hono<{ Bindings: Env }>();

// POST /api/payments/create — Create a payment intent (requires writeAuth)
payments.post("/create", writeAuth, async (c) => {
  const body = await c.req.json() as {
    registrationId: string;
    eventId: string;
    amount: number;
    currency?: string;
    returnUrl: string;
  };

  if (!body.registrationId || !body.eventId || !body.amount || !body.returnUrl) {
    return c.json({ error: "registrationId, eventId, amount, and returnUrl are required" }, 400);
  }

  // Verify the registration exists
  const registration = await c.env.DB.prepare(
    "SELECT id, user_id FROM registrations WHERE id = ? AND event_id = ?"
  ).bind(body.registrationId, body.eventId).first() as { id: string; user_id: string } | null;

  if (!registration) {
    return c.json({ error: "Registration not found" }, 404);
  }

  const paymentId = generateId();
  const currency = body.currency || "USD";

  // Create payment record
  await c.env.DB.prepare(`
    INSERT INTO payments (id, registration_id, event_id, user_id, amount_cents, currency, provider, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    paymentId,
    body.registrationId,
    body.eventId,
    registration.user_id,
    Math.round(body.amount * 100),
    currency,
    "paynow"
  ).run();

  // Attempt to create payment with provider
  const provider = new PaynowProvider(
    c.env.PAYNOW_INTEGRATION_ID || "",
    c.env.PAYNOW_INTEGRATION_KEY || ""
  );

  const result = await provider.createPayment({
    amount: body.amount,
    currency,
    reference: paymentId,
    description: `Registration ${body.registrationId} for event ${body.eventId}`,
    returnUrl: body.returnUrl,
  });

  if (result.success && result.providerReference) {
    await c.env.DB.prepare(
      "UPDATE payments SET provider_reference = ? WHERE id = ?"
    ).bind(result.providerReference, paymentId).run();
  }

  return c.json({
    paymentId,
    redirectUrl: result.redirectUrl || null,
    status: result.success ? "created" : "error",
    error: result.error,
  }, result.success ? 201 : 200);
});

// POST /api/payments/webhook — Handle payment status callback (no auth)
payments.post("/webhook", async (c) => {
  const payload = await c.req.json();

  const provider = new PaynowProvider(
    c.env.PAYNOW_INTEGRATION_ID || "",
    c.env.PAYNOW_INTEGRATION_KEY || ""
  );

  const result = await provider.handleWebhook(payload);

  if (!result.valid || !result.reference || !result.status) {
    return c.json({ error: "Invalid webhook payload" }, 400);
  }

  const statusUpdate = result.status === "completed"
    ? "status = 'completed', completed_at = datetime('now')"
    : result.status === "refunded"
    ? "status = 'refunded', refunded_at = datetime('now')"
    : `status = '${result.status}'`;

  await c.env.DB.prepare(
    `UPDATE payments SET ${statusUpdate} WHERE id = ? OR provider_reference = ?`
  ).bind(result.reference, result.reference).run();

  return c.json({ received: true });
});

// GET /api/payments/:id/status — Check payment status
payments.get("/:id/status", async (c) => {
  const paymentId = c.req.param("id");

  const payment = await c.env.DB.prepare(
    "SELECT id, status, amount_cents, currency, provider, created_at, completed_at FROM payments WHERE id = ?"
  ).bind(paymentId).first();

  if (!payment) {
    return c.json({ error: "Payment not found" }, 404);
  }

  return c.json({ payment });
});
