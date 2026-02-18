import type { Env, AnalyticsQueueMessage, EmailQueueMessage } from "../types";

export async function processAnalyticsMessage(message: AnalyticsQueueMessage, env: Env): Promise<void> {
  console.log(`Processing analytics message: ${message.type} for event ${message.eventId}`);

  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: [message.type, message.eventId, message.userId || "anonymous"],
      doubles: [Date.now()],
      indexes: [message.type],
    });
  }

  switch (message.type) {
    case "view":
      await env.DB.prepare(
        `UPDATE events SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?`
      ).bind(message.eventId).run();
      break;
    case "rsvp":
      break;
    case "referral":
      break;
    case "review":
      break;
  }
}

export async function processEmailMessage(message: EmailQueueMessage, env: Env): Promise<void> {
  console.log(`Processing email message: ${message.type} to ${message.to}`);
  // TODO: Integrate with email service (e.g., Resend, SendGrid, Mailgun)
}
