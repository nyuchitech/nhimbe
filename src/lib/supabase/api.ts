/**
 * Supabase-backed read/write helpers for nhimbe. These talk directly to
 * nyuchi_platform_db (project tdcpuzqyoodrdsxldgsh). Use them in tandem
 * with the existing worker-backed `src/lib/api.ts` — the Cloudflare worker
 * still owns AI inference, R2 image uploads, kiosk pairing, and queues.
 */

import { getSupabaseBrowserClient } from "./client";
import type {
  CircleMembershipRow,
  CirclePostRow,
  CircleRow,
  EventInsert,
  EventRow,
  InterestCategoryRow,
  OrganizationRow,
  PersonRow,
  PlaceRow,
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

// ─── Kraal (circles.* schema) ────────────────────────────────────────────
// Kraal is the user-facing name; the schema stays `circles`. Each circle
// can be linked to a parent event via circles.circle.linked_event_id, and
// each event references its kraal via events.event.event_circle_id.

export async function getCirclesForPerson(personId: string): Promise<CircleRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("circles")
    .from("circle_membership")
    .select("circle:circle_id(id, name, description, avatar_url, circle_purpose, circle_type, visibility, member_count, post_count, linked_event_id, organization_id, created_at)")
    .eq("person_id", personId)
    .eq("status", "active");
  if (error) {
    console.warn("[mukoko] getCirclesForPerson failed:", error.message);
    return [];
  }
  type Row = { circle: CircleRow | null };
  return ((data as unknown as Row[]) ?? [])
    .map((r) => r.circle)
    .filter((c): c is CircleRow => Boolean(c));
}

export async function getCircle(circleId: string): Promise<CircleRow | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("circles")
    .from("circle")
    .select("*")
    .eq("id", circleId)
    .single();
  if (error) {
    console.warn("[mukoko] getCircle failed:", error.message);
    return null;
  }
  return data as CircleRow;
}

export type KraalPostWithAuthor = CirclePostRow & {
  author: Pick<PersonRow, "id" | "display_name" | "given_name" | "family_name" | "image"> | null;
};

export async function getCirclePosts(circleId: string, limit = 20, archived = false): Promise<KraalPostWithAuthor[]> {
  const supabase = getSupabaseBrowserClient();
  const query = supabase
    .schema("circles")
    .from("post")
    .select("*, author:author_id(id, display_name, given_name, family_name, image)")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (archived) {
    query.eq("moderation_status", "archived");
  } else {
    query.neq("moderation_status", "archived");
  }
  const { data, error } = await query;
  if (error) {
    console.warn("[mukoko] getCirclePosts failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as KraalPostWithAuthor[];
}

export type KraalMember = CircleMembershipRow & {
  person: Pick<PersonRow, "id" | "display_name" | "given_name" | "family_name" | "image"> | null;
};

export async function getCircleMembers(circleId: string, limit = 50): Promise<KraalMember[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("circles")
    .from("circle_membership")
    .select("circle_id, person_id, role, status, joined_at, notification_pref, person:person_id(id, display_name, given_name, family_name, image)")
    .eq("circle_id", circleId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[mukoko] getCircleMembers failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as KraalMember[];
}

export async function createCirclePost(input: {
  circleId: string;
  authorId: string;
  text: string;
  postType?: string;
}): Promise<CirclePostRow> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .schema("circles")
    .from("post")
    .insert({
      circle_id: input.circleId,
      author_id: input.authorId,
      text: input.text,
      post_type: input.postType ?? "text",
      moderation_status: "approved",
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(`[mukoko] createCirclePost failed: ${error.message}`);
  }
  return data as CirclePostRow;
}

export async function togglePostReaction(input: {
  postId: string;
  personId: string;
  reaction?: string;
}): Promise<"added" | "removed"> {
  const supabase = getSupabaseBrowserClient();
  const reaction = input.reaction ?? "like";
  const { data: existing } = await supabase
    .schema("circles")
    .from("post_reaction")
    .select("post_id")
    .eq("post_id", input.postId)
    .eq("person_id", input.personId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .schema("circles")
      .from("post_reaction")
      .delete()
      .eq("post_id", input.postId)
      .eq("person_id", input.personId)
      .eq("reaction", reaction);
    if (error) throw new Error(`[mukoko] togglePostReaction remove failed: ${error.message}`);
    return "removed";
  }

  const { error } = await supabase
    .schema("circles")
    .from("post_reaction")
    .insert({ post_id: input.postId, person_id: input.personId, reaction });
  if (error) throw new Error(`[mukoko] togglePostReaction add failed: ${error.message}`);
  return "added";
}

export async function joinCircle(input: { circleId: string; personId: string }): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .schema("circles")
    .from("circle_membership")
    .upsert(
      {
        circle_id: input.circleId,
        person_id: input.personId,
        role: "member",
        status: "active",
      },
      { onConflict: "circle_id,person_id" },
    );
  if (error) throw new Error(`[mukoko] joinCircle failed: ${error.message}`);
}
