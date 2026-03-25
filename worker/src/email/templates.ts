/**
 * Email templates for nhimbe transactional emails.
 * Each template returns HTML + plain text versions.
 */

interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

// Shared email wrapper with nhimbe branding
function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0a0a0a; color: #e4e4e7; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 18px; color: #64FFDA; margin: 0; letter-spacing: 0.5px; }
    .content { background: #18181b; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .event-name { font-size: 20px; font-weight: 600; color: #fafafa; margin: 0 0 12px; }
    .detail { font-size: 14px; color: #a1a1aa; margin: 4px 0; }
    .cta { display: inline-block; background: #64FFDA; color: #0a0a0a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .footer { text-align: center; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>nhimbe</h1></div>
    ${content}
    <div class="footer">
      <p>nhimbe — together we gather, together we grow</p>
    </div>
  </div>
</body>
</html>`;
}

// Registration confirmation
export function registrationConfirmed(data: {
  userName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
}): TemplateResult {
  return {
    subject: `You're registered for ${data.eventName}`,
    html: wrapHtml(`
      <div class="content">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${data.userName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">You're registered for:</p>
        <p class="event-name">${data.eventName}</p>
        <p class="detail">📅 ${data.eventDate}</p>
        <p class="detail">📍 ${data.eventLocation}</p>
        <a href="${data.eventUrl}" class="cta">View Event Details</a>
      </div>
    `),
    text: `Hi ${data.userName},\n\nYou're registered for ${data.eventName}!\n\nDate: ${data.eventDate}\nLocation: ${data.eventLocation}\n\nView details: ${data.eventUrl}\n\n— nhimbe`,
  };
}

// Event reminder (24h before)
export function eventReminder(data: {
  userName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventUrl: string;
}): TemplateResult {
  return {
    subject: `Reminder: ${data.eventName} is tomorrow`,
    html: wrapHtml(`
      <div class="content">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${data.userName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">Just a reminder — your event is tomorrow:</p>
        <p class="event-name">${data.eventName}</p>
        <p class="detail">📅 ${data.eventDate}</p>
        <p class="detail">📍 ${data.eventLocation}</p>
        <a href="${data.eventUrl}" class="cta">View Event</a>
      </div>
    `),
    text: `Hi ${data.userName},\n\nReminder: ${data.eventName} is tomorrow!\n\nDate: ${data.eventDate}\nLocation: ${data.eventLocation}\n\nView details: ${data.eventUrl}\n\n— nhimbe`,
  };
}

// Event cancelled
export function eventCancelled(data: {
  userName: string;
  eventName: string;
  eventDate: string;
}): TemplateResult {
  return {
    subject: `${data.eventName} has been cancelled`,
    html: wrapHtml(`
      <div class="content">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${data.userName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">Unfortunately, the following event has been cancelled:</p>
        <p class="event-name">${data.eventName}</p>
        <p class="detail">📅 ${data.eventDate}</p>
        <p style="margin: 16px 0 0; font-size: 14px; color: #a1a1aa;">
          We apologize for any inconvenience. Check out other events on nhimbe.
        </p>
      </div>
    `),
    text: `Hi ${data.userName},\n\nUnfortunately, ${data.eventName} (${data.eventDate}) has been cancelled.\n\nWe apologize for any inconvenience.\n\n— nhimbe`,
  };
}

// Host notification: new registration
export function hostNewRegistration(data: {
  hostName: string;
  attendeeName: string;
  eventName: string;
  attendeeCount: number;
  eventUrl: string;
}): TemplateResult {
  return {
    subject: `${data.attendeeName} registered for ${data.eventName}`,
    html: wrapHtml(`
      <div class="content">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${data.hostName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">
          <strong>${data.attendeeName}</strong> just registered for your event:
        </p>
        <p class="event-name">${data.eventName}</p>
        <p class="detail">Total attendees: ${data.attendeeCount}</p>
        <a href="${data.eventUrl}" class="cta">Manage Event</a>
      </div>
    `),
    text: `Hi ${data.hostName},\n\n${data.attendeeName} registered for ${data.eventName}.\n\nTotal attendees: ${data.attendeeCount}\n\nManage: ${data.eventUrl}\n\n— nhimbe`,
  };
}

// Registration cancelled
export function registrationCancelled(data: {
  userName: string;
  eventName: string;
  eventDate: string;
}): TemplateResult {
  return {
    subject: `Registration cancelled: ${data.eventName}`,
    html: wrapHtml(`
      <div class="content">
        <p style="margin: 0 0 16px; font-size: 15px;">Hi ${data.userName},</p>
        <p style="margin: 0 0 16px; font-size: 15px;">
          Your registration for the following event has been cancelled:
        </p>
        <p class="event-name">${data.eventName}</p>
        <p class="detail">📅 ${data.eventDate}</p>
      </div>
    `),
    text: `Hi ${data.userName},\n\nYour registration for ${data.eventName} (${data.eventDate}) has been cancelled.\n\n— nhimbe`,
  };
}
