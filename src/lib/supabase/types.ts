/**
 * Hand-rolled row types for the nyuchi_platform_db tables that nhimbe reads
 * and writes. Mirrors the columns confirmed via `information_schema` on
 * project tdcpuzqyoodrdsxldgsh — keep in sync if the platform schema changes.
 *
 * The Supabase auto-gen types only cover the `public` schema by default;
 * the `events`, `circles`, `engagement`, `places`, `identity`, `business`,
 * `ubuntu`, `weather`, `shamwari`, `wallet` schemas must be exposed under
 * Settings → API → Exposed schemas in the Supabase dashboard. This file is
 * the source of truth for nhimbe-side types until that's wired and full
 * generation runs cleanly.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── events ──────────────────────────────────────────────────────────────

export type EventRow = {
  id: string;
  eventtype: string;
  name: string;
  slug: string | null;
  description: string | null;
  startdate: string;
  enddate: string | null;
  timezone: string;
  duration: string | null;
  eventstatus: string;
  eventattendancemode: string;
  location: Json;
  place_id: string | null;
  virtuallocation: Json | null;
  image: string[] | null;
  organizer: Json;
  organizer_person_id: string | null;
  organization_id: string | null;
  performer: Json | null;
  offers: Json | null;
  isaccessibleforfree: boolean | null;
  maximumattendeecapacity: number | null;
  audience: Json | null;
  typicalagerange: string | null;
  eventschedule: Json | null;
  about: Json | null;
  sponsor: Json | null;
  contributor: Json | null;
  inlanguage: string | null;
  keywords: string[] | null;
  category: string | null;
  is_featured: boolean | null;
  is_verified: boolean | null;
  view_count: number | null;
  attendee_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  event_circle_id: string | null;
  campfire_conversation_id: string | null;
  rrule: string | null;
  recurrence_end: string | null;
  series_parent_id: string | null;
  series_occurrence: number | null;
  check_in_enabled: boolean | null;
  checked_in_count: number | null;
  waitlist_enabled: boolean | null;
  waitlist_count: number | null;
  requires_approval: boolean | null;
  super_event: string | null;
  visibility: string;
  calendar_type: string;
  owner_type: string;
  owner_id: string;
  target_country_id: string | null;
  target_city_id: string | null;
};

export type EventInsert = Omit<EventRow, "id" | "created_at" | "updated_at" | "view_count" | "attendee_count" | "checked_in_count" | "waitlist_count"> & {
  id?: string;
};

export type TicketTierRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  tier_type: string;
  price: number | null;
  pricecurrency: string | null;
  quantity_total: number | null;
  quantity_sold: number | null;
  quantity_reserved: number | null;
  sales_start: string | null;
  sales_end: string | null;
  is_visible: boolean | null;
  is_nft_ticket: boolean | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RsvpActionRow = {
  id: string;
  event_id: string;
  agent_person_id: string;
  rsvpresponse: "RsvpResponseYes" | "RsvpResponseNo" | "RsvpResponseMaybe";
  starttime: string | null;
  additional_guests: number | null;
  guest_names: string[] | null;
  comment: string | null;
  confirmation_status: string | null;
  waitlist_position: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SaveActionRow = {
  person_id: string;
  event_id: string;
  saved_at: string | null;
};

export type WaitlistEntryRow = {
  id: string;
  event_id: string;
  person_id: string;
  position: number;
  joined_at: string | null;
  promoted_at: string | null;
  status: string;
};

// ─── circles ─────────────────────────────────────────────────────────────

export type CircleRow = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  interest_categories: string[] | null;
  tags: string[] | null;
  circle_purpose: string;
  circle_type: string | null;
  visibility: string;
  requires_approval: boolean | null;
  created_by: string;
  member_count: number | null;
  message_count: number | null;
  post_count: number | null;
  linked_event_id: string | null;
  organization_id: string | null;
  country_id: string | null;
  city_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CircleMembershipRow = {
  circle_id: string;
  person_id: string;
  role: "founder" | "host" | "moderator" | "member";
  status: "active" | "pending" | "suspended" | "left";
  joined_at: string | null;
  notification_pref: string | null;
};

export type CirclePostRow = {
  id: string;
  circle_id: string;
  author_id: string;
  text: string | null;
  image: string[] | null;
  video_url: string | null;
  link_url: string | null;
  post_type: string | null;
  is_pinned: boolean | null;
  like_count: number | null;
  comment_count: number | null;
  moderation_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CirclePostReactionRow = {
  post_id: string;
  person_id: string;
  reaction: string;
  created_at: string | null;
};

// ─── engagement ──────────────────────────────────────────────────────────

export type InterestCategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  parent_category_id: string | null;
  description: string | null;
  icon_url: string | null;
  color_hex: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  group_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReviewRow = {
  id: string;
  schema_type: string;
  author: string;
  item_reviewed_type: string;
  item_reviewed_id: string;
  item_reviewed_schema: string;
  review_rating: Json;
  rating_value: number;
  name: string | null;
  review_body: string;
  date_published: string | null;
  date_modified: string | null;
  in_language: string | null;
  helpful_count: number | null;
  moderation_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type FollowActionRow = {
  follower_person_id: string;
  followed_type: "person" | "organization" | "event" | "place";
  followed_id: string;
  starttime: string | null;
};

// ─── places ──────────────────────────────────────────────────────────────

export type PlaceRow = {
  id: string;
  schema_type: string;
  name: string;
  slug: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  postal_address: Json | null;
  address_locality: string | null;
  address_region: string | null;
  street_address: string | null;
  postal_code: string | null;
  contact_point: Json | null;
  website: string | null;
  image: string[] | null;
  cover_image: string | null;
  country_id: string | null;
  province_id: string | null;
  maximum_attendee_capacity: number | null;
  verified: boolean | null;
  aggregate_rating_value: number | null;
  aggregate_rating_count: number | null;
};

export type CountryRow = {
  id: string;
  name: string;
  iso_code: string;
  continent: string | null;
  currency_code: string | null;
  flag_emoji: string | null;
  active: boolean | null;
};

export type ProvinceRow = {
  id: string;
  name: string;
  country_id: string;
  code: string | null;
};

// ─── identity / business ────────────────────────────────────────────────

export type PersonRow = {
  id: string;
  given_name: string | null;
  family_name: string | null;
  display_name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo: string | null;
  url: string | null;
  verified: boolean | null;
};

// ─── ubuntu ──────────────────────────────────────────────────────────────

export type ImpactScoreRow = {
  person_id: string;
  total_score: number | null;
  reputation_tier: string | null;
  contribution_count: number | null;
  badge_count: number | null;
  updated_at: string | null;
};

export type UserBadgeRow = {
  person_id: string;
  badge_id: string;
  awarded_at: string | null;
};

// ─── weather ─────────────────────────────────────────────────────────────

export type WeatherForecastRow = {
  id: string;
  place_id: string | null;
  forecast_date: string;
  temperature_high: number | null;
  temperature_low: number | null;
  conditions: string | null;
  precipitation_chance: number | null;
  icon: string | null;
};

// ─── wallet ──────────────────────────────────────────────────────────────

export type PaymentIntentRow = {
  id: string;
  person_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";
  reference: string | null;
  metadata: Json | null;
  created_at: string | null;
  updated_at: string | null;
};
