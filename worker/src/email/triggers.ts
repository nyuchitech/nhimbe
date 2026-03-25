/**
 * Email trigger functions — queue message producers.
 * Each function enqueues an EmailQueueMessage to EMAIL_QUEUE.
 */

import type { Env, EmailQueueMessage } from "../types";

const SENDER = "nhimbe <notifications@nhimbe.com>";

export async function enqueueRegistrationConfirmation(
  env: Env,
  data: {
    userEmail: string;
    userName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    eventId: string;
  }
): Promise<void> {
  if (!env.EMAIL_QUEUE) return;

  const message: EmailQueueMessage = {
    type: "registration_confirmation",
    to: data.userEmail,
    subject: `You're registered for ${data.eventName}`,
    templateData: {
      ...data,
      from: SENDER,
    },
  };

  await env.EMAIL_QUEUE.send(message);
}

export async function enqueueEventReminder(
  env: Env,
  data: {
    userEmail: string;
    userName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    eventId: string;
  }
): Promise<void> {
  if (!env.EMAIL_QUEUE) return;

  const message: EmailQueueMessage = {
    type: "event_reminder",
    to: data.userEmail,
    subject: `Reminder: ${data.eventName} is tomorrow`,
    templateData: {
      ...data,
      from: SENDER,
    },
  };

  await env.EMAIL_QUEUE.send(message);
}

export async function enqueueEventCancellation(
  env: Env,
  data: {
    userEmail: string;
    userName: string;
    eventName: string;
    eventDate: string;
  }
): Promise<void> {
  if (!env.EMAIL_QUEUE) return;

  const message: EmailQueueMessage = {
    type: "event_cancelled",
    to: data.userEmail,
    subject: `${data.eventName} has been cancelled`,
    templateData: {
      ...data,
      from: SENDER,
    },
  };

  await env.EMAIL_QUEUE.send(message);
}

export async function enqueueHostNotification(
  env: Env,
  data: {
    hostEmail: string;
    hostName: string;
    attendeeName: string;
    eventName: string;
    attendeeCount: number;
    eventId: string;
  }
): Promise<void> {
  if (!env.EMAIL_QUEUE) return;

  const message: EmailQueueMessage = {
    type: "host_new_registration",
    to: data.hostEmail,
    subject: `${data.attendeeName} registered for ${data.eventName}`,
    templateData: {
      ...data,
      from: SENDER,
    },
  };

  await env.EMAIL_QUEUE.send(message);
}

export async function enqueueRegistrationCancellation(
  env: Env,
  data: {
    userEmail: string;
    userName: string;
    eventName: string;
    eventDate: string;
  }
): Promise<void> {
  if (!env.EMAIL_QUEUE) return;

  const message: EmailQueueMessage = {
    type: "registration_cancelled",
    to: data.userEmail,
    subject: `Registration cancelled: ${data.eventName}`,
    templateData: {
      ...data,
      from: SENDER,
    },
  };

  await env.EMAIL_QUEUE.send(message);
}
