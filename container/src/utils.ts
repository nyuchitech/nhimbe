/**
 * Shared utility functions for the nhimbe container app.
 */

import crypto from "node:crypto";
import type { SchemaEvent, SchemaPlace, SchemaVirtualLocation, SchemaOffer } from "./schema.js";

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateShortCode(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function generateHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `@${base}${suffix}`;
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function safeParseInt(
  value: string | null | undefined,
  defaultValue: number,
  min = 0,
  max = 1000
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

export function validateRequiredFields(
  obj: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (
      !obj[field] ||
      (typeof obj[field] === "string" && !(obj[field] as string).trim())
    ) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Build a SchemaEvent document from API input for MongoDB insertion.
 */
export function buildEventDocument(
  input: Record<string, unknown>,
  organizerId: string,
  organizerName: string,
  organizerHandle?: string
): SchemaEvent {
  const now = new Date().toISOString();
  const name = input.name as string;
  const startDate = input.startDate as string;
  const startDateObj = new Date(startDate);
  const isOnline = input.eventAttendanceMode === "OnlineEventAttendanceMode";

  const location: SchemaPlace | SchemaVirtualLocation = isOnline
    ? {
        "@type": "VirtualLocation" as const,
        url: (input.meetingUrl as string) || "",
      }
    : {
        "@type": "Place" as const,
        name: (input.locationName as string) || "",
        address: {
          "@type": "PostalAddress" as const,
          streetAddress: (input.streetAddress as string) || "",
          addressLocality: (input.addressLocality as string) || "",
          addressCountry: (input.addressCountry as string) || "",
        },
      };

  const offers: SchemaOffer | undefined =
    input.price !== undefined && input.price !== 0
      ? {
          "@type": "Offer" as const,
          price: input.price as number,
          priceCurrency: (input.priceCurrency as string) || "USD",
          url: input.ticketUrl as string | undefined,
          availability: "https://schema.org/InStock",
        }
      : undefined;

  return {
    _id: generateId(),
    "@type": "Event",
    name,
    description: (input.description as string) || "",
    startDate,
    endDate: input.endDate as string | undefined,
    eventAttendanceMode: (input.eventAttendanceMode as SchemaEvent["eventAttendanceMode"]) || "OfflineEventAttendanceMode",
    eventStatus: "EventScheduled",
    image: input.image as string | undefined,
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    maximumAttendeeCapacity: input.maximumAttendeeCapacity as number | undefined,
    location,
    organizer: {
      "@type": "Person",
      name: organizerName,
      identifier: organizerId,
      alternateName: organizerHandle,
      initials: getInitials(organizerName),
      eventCount: 0,
    },
    offers,
    shortCode: generateShortCode(),
    slug: slugify(name),
    category: (input.category as string) || "Other",
    attendeeCount: 0,
    friendsCount: 0,
    coverGradient: input.coverGradient as string | undefined,
    themeId: (input.themeId as string) || "malachite",
    isPublished: true,
    meetingUrl: input.meetingUrl as string | undefined,
    meetingPlatform: input.meetingPlatform as SchemaEvent["meetingPlatform"],
    dateDisplay: {
      day: startDateObj.getDate().toString(),
      month: startDateObj.toLocaleString("en", { month: "long" }),
      full: startDateObj.toLocaleDateString("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: (input.displayTime as string) || startDateObj.toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    dateCreated: now,
    dateModified: now,
  };
}
