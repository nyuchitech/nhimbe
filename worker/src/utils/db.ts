import type { Event } from "../types";
import { safeParseJSON } from "./validation";

// Convert production D1 row (schema.org-aligned columns) to Event object
export function dbRowToEvent(row: Record<string, unknown>): Event {
  return {
    id: row._id as string,
    shortCode: row.short_code as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string | undefined,
    date: {
      day: row.date_display_day as string,
      month: row.date_display_month as string,
      full: row.date_display_full as string,
      time: row.date_display_time as string,
    },
    location: {
      type: row.location_type as string | undefined,
      name: (row.location_name as string) || "",
      streetAddress: row.location_street_address as string | undefined,
      addressLocality: (row.location_locality as string) || "",
      addressCountry: (row.location_country as string) || "",
      url: row.location_url as string | undefined,
    },
    category: row.category as string,
    keywords: safeParseJSON(row.keywords as string, []) as string[],
    image: row.image as string | undefined,
    coverGradient: row.cover_gradient as string | undefined,
    themeId: row.theme_id as string | undefined,
    attendeeCount: (row.attendee_count as number) || 0,
    friendsCount: row.friends_count as number | undefined,
    maximumAttendeeCapacity: row.maximum_attendee_capacity as number | undefined,
    eventAttendanceMode: row.event_attendance_mode as string | undefined,
    eventStatus: row.event_status as string | undefined,
    isPublished: !!(row.is_published),
    meetingUrl: row.meeting_url as string | undefined,
    meetingPlatform: row.meeting_platform as string | undefined,
    organizer: {
      name: (row.organizer_name as string) || "",
      alternateName: row.organizer_alternate_name as string | undefined,
      initials: (row.organizer_initials as string) || "",
      identifier: row.organizer_identifier as string | undefined,
      eventCount: (row.organizer_event_count as number) || 0,
    },
    offers: (row.offer_price != null || row.offer_url) ? {
      price: row.offer_price as number | undefined,
      priceCurrency: row.offer_price_currency as string | undefined,
      url: row.offer_url as string | undefined,
      availability: row.offer_availability as string | undefined,
    } : undefined,
    dateCreated: row.date_created as string,
    dateModified: row.date_modified as string,
  };
}
