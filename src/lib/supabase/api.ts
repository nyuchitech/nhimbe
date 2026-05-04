/**
 * Supabase-backed read/write helpers for nhimbe. These talk directly to
 * nyuchi_platform_db (project tdcpuzqyoodrdsxldgsh). Use them in tandem
 * with the existing worker-backed `src/lib/api.ts` — the Cloudflare worker
 * still owns AI inference, R2 image uploads, kiosk pairing, and queues.
 */

import { getSupabaseBrowserClient } from "./client";
import type {
  EventInsert,
  EventRow,
  InterestCategoryRow,
  PlaceRow,
  OrganizationRow,
} from "./types";

// ─── Categories ───────────────────────────────────────────────────────────
// 40 canonical categories live in engagement.interest_category. They're
// broad (technology, music, business, sports, education, food, faith,
// culture, family, governance, …) — no longer the events-only narrow set.

export async function getInterestCategories(): Promise<InterestCategoryRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("engagement")
    .from("interest_category")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.warn("[mukoko] getInterestCategories failed:", error.message);
    return [];
  }
  return (data ?? []) as InterestCategoryRow[];
}

// ─── Venues ──────────────────────────────────────────────────────────────
// `places.places` is the unified venue/place table. Use this for the
// debounced venue picker in the creation wizard — typing "harare" returns
// venues whose name OR address_locality matches.

export async function searchVenues(query: string, limit = 8): Promise<PlaceRow[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("places")
    .from("places")
    .select("id, schema_type, name, slug, latitude, longitude, address_locality, address_region, street_address, country_id, province_id, image, cover_image")
    .or(`name.ilike.%${trimmed}%,address_locality.ilike.%${trimmed}%`)
    .limit(limit);
  if (error) {
    console.warn("[mukoko] searchVenues failed:", error.message);
    return [];
  }
  return (data ?? []) as PlaceRow[];
}

// ─── Organisations the current person belongs to ────────────────────────
// Used by the host-mode toggle on step 3 of the creation wizard. Returns
// every organisation the current person is a member of.

export async function getOrgsForPerson(personId: string): Promise<OrganizationRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("business")
    .from("membership")
    .select("organization_id, organization:business_organization!inner(id, name, slug, description, logo, url, verified)")
    .eq("person_id", personId);
  if (error) {
    console.warn("[mukoko] getOrgsForPerson failed:", error.message);
    return [];
  }
  type Row = { organization: OrganizationRow | null };
  return ((data as unknown as Row[]) ?? [])
    .map((r) => r.organization)
    .filter((o): o is OrganizationRow => Boolean(o));
}

// ─── Create Event ────────────────────────────────────────────────────────
// Inserts into events.event with the schema.org-aligned column shape.

export type CreateEventOnSupabaseInput = {
  ownerPersonId: string;
  organizationId: string | null;
  name: string;
  description: string;
  startdate: string;
  enddate: string | null;
  timezone: string;
  category: string | null;
  keywords: string[];
  image: string[] | null;
  placeId: string | null;
  virtualLocation: { url: string; platform?: string } | null;
  attendanceMode: "OnlineEventAttendanceMode" | "OfflineEventAttendanceMode" | "MixedEventAttendanceMode";
  maximumAttendeeCapacity: number | null;
  requiresApproval: boolean;
  visibility: "public" | "private" | "unlisted";
};

export async function createEventOnSupabase(input: CreateEventOnSupabaseInput): Promise<EventRow> {
  const supabase = getSupabaseBrowserClient();

  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  const isOrgHosted = Boolean(input.organizationId);

  const row: Partial<EventInsert> = {
    name: input.name,
    slug: slug || null,
    description: input.description,
    eventtype: "Event",
    eventstatus: "EventScheduled",
    eventattendancemode: input.attendanceMode,
    startdate: input.startdate,
    enddate: input.enddate,
    timezone: input.timezone,
    location: input.placeId ? { "@type": "Place", placeId: input.placeId } : { "@type": "VirtualLocation" },
    place_id: input.placeId,
    virtuallocation: input.virtualLocation,
    image: input.image,
    organizer: isOrgHosted
      ? { "@type": "Organization", id: input.organizationId }
      : { "@type": "Person", id: input.ownerPersonId },
    organizer_person_id: isOrgHosted ? null : input.ownerPersonId,
    organization_id: input.organizationId,
    category: input.category,
    keywords: input.keywords,
    maximumattendeecapacity: input.maximumAttendeeCapacity,
    requires_approval: input.requiresApproval,
    visibility: input.visibility,
    calendar_type: "event",
    owner_type: isOrgHosted ? "organization" : "person",
    owner_id: isOrgHosted ? (input.organizationId as string) : input.ownerPersonId,
  };

  const { data, error } = await supabase
    .schema("events")
    .from("event")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`[mukoko] createEventOnSupabase failed: ${error.message}`);
  }
  return data as EventRow;
}
