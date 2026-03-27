/**
 * Calendar export utilities
 * Generates ICS files and calendar URLs for Google Calendar and Outlook
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  url?: string;
}

/**
 * Format date for ICS file (YYYYMMDDTHHMMSSZ)
 */
function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate an ICS file content string
 */
export function generateICS(event: CalendarEvent): string {
  const uid = `${Date.now()}-${crypto.randomUUID().slice(0, 9)}@nhimbe.com`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//nhimbe//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    `DTSTART:${formatDateForICS(event.startDate)}`,
    `DTEND:${formatDateForICS(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}${event.url ? `\\n\\nEvent page: ${event.url}` : ""}`,
    `LOCATION:${escapeICS(event.location)}`,
    event.url ? `URL:${event.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return icsContent;
}

/**
 * Download an ICS file
 */
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for URL parameters (YYYYMMDDTHHMMSSZ)
 */
function formatDateForURL(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatDateForURL(event.startDate)}/${formatDateForURL(event.endDate)}`,
    details: event.description + (event.url ? `\n\nEvent page: ${event.url}` : ""),
    location: event.location,
  });

  if (event.url) {
    params.set("sprop", `website:${event.url}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL (Office 365)
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description + (event.url ? `\n\nEvent page: ${event.url}` : ""),
    location: event.location,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Outlook.com Calendar URL (personal)
 */
export function getOutlookLiveUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description + (event.url ? `\n\nEvent page: ${event.url}` : ""),
    location: event.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function getYahooCalendarUrl(event: CalendarEvent): string {
  // Yahoo uses a different date format: YYYYMMDDTHHMMSS (no Z)
  const formatYahooDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0];
  };

  const params = new URLSearchParams({
    v: "60",
    title: event.title,
    st: formatYahooDate(event.startDate),
    et: formatYahooDate(event.endDate),
    desc: event.description + (event.url ? `\n\nEvent page: ${event.url}` : ""),
    in_loc: event.location,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Parse an ISO date string and time string into a Date object
 */
export function parseEventDateTime(isoDate: string, timeStr?: string): Date {
  const date = new Date(isoDate);

  if (timeStr) {
    // Parse time like "6:00 PM" or "18:00"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3]?.toUpperCase();

      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }

      date.setHours(hours, minutes, 0, 0);
    }
  }

  return date;
}

/**
 * Get end date by adding duration to start date
 */
export function getEndDate(startDate: Date, durationHours: number = 2): Date {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + durationHours);
  return endDate;
}
