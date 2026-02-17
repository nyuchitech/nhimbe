/**
 * nhimbe API Client
 * Handles all communication with the Cloudflare Workers backend.
 * Types use schema.org vocabulary matching the MongoDB data model.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://events-api.mukoko.com";

// ── Schema.org Location Types ──────────────────────────────────────

export interface PostalAddress {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressCountry: string;
}

export interface Place {
  "@type": "Place";
  name: string;
  address: PostalAddress;
}

export interface VirtualLocation {
  "@type": "VirtualLocation";
  url: string;
}

// ── Schema.org Organizer ────────────────────────────────────────────

export interface Organizer {
  "@type": "Person";
  name: string;
  identifier?: string;
  alternateName?: string;
  initials?: string;
  eventCount?: number;
}

// ── Schema.org Offer ────────────────────────────────────────────────

export interface Offer {
  "@type": "Offer";
  price: number;
  priceCurrency: string;
  url?: string;
  availability: string;
}

// ── Schema.org Rating ───────────────────────────────────────────────

export interface Rating {
  "@type": "Rating";
  ratingValue: number;
  bestRating: number;
  worstRating: number;
}

export interface AggregateRating {
  "@type": "AggregateRating";
  ratingValue: number;
  reviewCount: number;
  bestRating: number;
  worstRating: number;
}

// ── Event (schema.org/Event) ────────────────────────────────────────

export type EventAttendanceMode =
  | "OfflineEventAttendanceMode"
  | "OnlineEventAttendanceMode"
  | "MixedEventAttendanceMode";

export type EventStatus =
  | "EventScheduled"
  | "EventCancelled"
  | "EventPostponed"
  | "EventMovedOnline";

export interface Event {
  _id: string;
  "@type": "Event";

  // schema.org core
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  eventAttendanceMode: EventAttendanceMode;
  eventStatus: EventStatus;
  image?: string;
  keywords: string[];
  maximumAttendeeCapacity?: number;
  location: Place | VirtualLocation;
  organizer: Organizer;
  offers?: Offer;
  aggregateRating?: AggregateRating;

  // nhimbe extensions
  shortCode: string;
  slug: string;
  category: string;
  attendeeCount: number;
  friendsCount?: number;
  friends?: Array<{ name: string; image?: string }>;
  coverGradient?: string;
  themeId?: string;
  isPublished: boolean;
  meetingUrl?: string;
  meetingPlatform?: "zoom" | "google_meet" | "teams" | "other";

  /** Convenience display fields derived from startDate */
  dateDisplay: {
    day: string;
    month: string;
    full: string;
    time: string;
  };

  dateCreated: string;
  dateModified: string;
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// Category with id, name, and group (matching Mukoko's 32 interest categories)
export interface Category {
  id: string;
  name: string;
  group: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CitiesResponse {
  cities: { city: string; country: string }[];
}

// ── Helper functions for schema.org location discriminated union ─────

/** Type guard: true when event.location is a physical Place */
export function isPlace(location: Place | VirtualLocation): location is Place {
  return location["@type"] === "Place";
}

/** True when event is online-only */
export function isOnlineEvent(event: Event): boolean {
  return event.eventAttendanceMode === "OnlineEventAttendanceMode";
}

/** Safely extract Place fields (falls back for virtual events) */
export function getPlaceInfo(event: Event) {
  const loc = event.location;
  if (isPlace(loc)) {
    return {
      venue: loc.name,
      streetAddress: loc.address.streetAddress,
      city: loc.address.addressLocality,
      country: loc.address.addressCountry,
    };
  }
  return { venue: "Online", streetAddress: "", city: "Online", country: "" };
}

// ── API fetch wrapper ───────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ── Events API ──────────────────────────────────────────────────────

export async function getEvents(params?: {
  city?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<EventsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.city) searchParams.set("city", params.city);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const query = searchParams.toString();
  return apiFetch<EventsResponse>(`/api/events${query ? `?${query}` : ""}`);
}

export async function getEventById(id: string): Promise<{ event: Event } | null> {
  try {
    return await apiFetch<{ event: Event }>(`/api/events/${id}`);
  } catch {
    return null;
  }
}

export async function getEventByShortCode(shortCode: string): Promise<{ event: Event } | null> {
  try {
    return await apiFetch<{ event: Event }>(`/api/events/${shortCode}`);
  } catch {
    return null;
  }
}

// Helper to get event by ID, slug, or shortCode (tries all three)
export async function findEvent(identifier: string): Promise<Event | null> {
  const result = await getEventById(identifier);
  return result?.event || null;
}

// Categories API
export async function getCategories(): Promise<Category[]> {
  const response = await apiFetch<CategoriesResponse>("/api/categories");
  return response.categories;
}

// Cities API
export async function getCities(): Promise<{ city: string; country: string }[]> {
  const response = await apiFetch<CitiesResponse>("/api/cities");
  return response.cities;
}

// ── Create / Update / Delete Events ─────────────────────────────────

export interface CreateEventInput {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: Place | VirtualLocation;
  category: string;
  keywords: string[];
  image?: string;
  coverGradient?: string;
  maximumAttendeeCapacity?: number;
  eventAttendanceMode?: EventAttendanceMode;
  meetingUrl?: string;
  meetingPlatform?: "zoom" | "google_meet" | "teams" | "other";
  organizer: Organizer;
  offers?: Offer;
}

export async function createEvent(event: CreateEventInput): Promise<{ event: Event; message: string }> {
  return apiFetch<{ event: Event; message: string }>("/api/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function updateEvent(id: string, updates: Partial<CreateEventInput>): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteEvent(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "DELETE",
  });
}

// ── Registrations API ───────────────────────────────────────────────

export type RsvpResponse =
  | "pending"
  | "registered"
  | "approved"
  | "rejected"
  | "cancelled"
  | "attended";

export interface Registration {
  _id: string;
  event: string;
  agent: string;
  rsvpResponse: RsvpResponse;
  ticketType?: string;
  ticketPrice?: number;
  ticketCurrency?: string;
  dateCreated: string;
  dateCancelled?: string;
  // Enriched user data (when available)
  userName?: string;
  userEmail?: string;
  userImage?: string;
}

export interface RegistrationsResponse {
  registrations: Registration[];
}

export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?event=${eventId}`);
  return response.registrations;
}

export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?agent=${userId}`);
  return response.registrations;
}

export async function registerForEvent(data: {
  event: string;
  agent: string;
  ticketType?: string;
  ticketPrice?: number;
  ticketCurrency?: string;
}): Promise<{ registration: Registration }> {
  return apiFetch<{ registration: Registration }>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRegistrationStatus(
  registrationId: string,
  rsvpResponse: RsvpResponse
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/registrations/${registrationId}`, {
    method: "PUT",
    body: JSON.stringify({ rsvpResponse }),
  });
}

export async function cancelRegistration(registrationId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/registrations/${registrationId}`, {
    method: "DELETE",
  });
}

// ── Users API ───────────────────────────────────────────────────────

export type UserRole = "user" | "moderator" | "admin" | "super_admin";

export interface User {
  _id: string;
  "@type": "Person";
  email: string;
  name: string;
  alternateName?: string;
  image?: string;
  description?: string;
  address?: {
    "@type": "PostalAddress";
    addressLocality?: string;
    addressCountry?: string;
  };
  interests?: string[];
  eventsAttended: number;
  eventsHosted: number;
  role: UserRole;
  stytchUserId?: string;
  mukokoOrgMemberId?: string;
  authProvider?: "email" | "mukoko_id";
  emailVerified: boolean;
  onboardingCompleted: boolean;
  dateCreated: string;
  dateModified: string;
}

export async function getUser(idOrHandle: string): Promise<User | null> {
  try {
    const response = await apiFetch<{ user: User }>(`/api/users/${idOrHandle}`);
    return response.user;
  } catch {
    return null;
  }
}

export async function createUser(data: {
  email: string;
  name: string;
  city?: string;
  country?: string;
  interests?: string[];
  stytchUserId?: string;
  mukokoOrgMemberId?: string;
}): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Event Views Tracking ────────────────────────────────────────────

export async function trackEventView(eventId: string, userId?: string): Promise<void> {
  try {
    await apiFetch("/api/events/" + eventId + "/view", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  } catch {
    // Silently fail - analytics shouldn't break the UI
  }
}

// ── Media Upload (R2) ───────────────────────────────────────────────

export interface UploadMediaResponse {
  key: string;
  url: string;
  message: string;
}

export async function uploadMedia(file: File): Promise<UploadMediaResponse> {
  const url = `${API_URL}/api/media/upload`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || `Upload failed: ${response.status}`);
  }

  return response.json();
}

export function getMediaUrl(key: string, options?: { width?: number; height?: number; format?: "webp" | "avif" | "jpeg" | "png" }): string {
  let url = `${API_URL}/api/media/${key}`;

  if (options) {
    const params = new URLSearchParams();
    if (options.width) params.set("w", options.width.toString());
    if (options.height) params.set("h", options.height.toString());
    if (options.format) params.set("format", options.format);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  return url;
}

// ── AI Description Generator ────────────────────────────────────────

export interface DescriptionWizardStep {
  question: string;
  placeholder: string;
  helpText?: string;
}

export interface DescriptionContext {
  eventType?: string;
  targetAudience?: string;
  keyTakeaways?: string;
  highlights?: string;
  eventName?: string;
  category?: string;
  isOnline?: boolean;
}

export interface GeneratedDescription {
  description: string;
  suggestions?: string[];
}

export async function getDescriptionWizardSteps(category?: string): Promise<{ steps: DescriptionWizardStep[] }> {
  const url = `${API_URL}/api/ai/description/wizard-steps`;

  if (category) {
    return apiFetch<{ steps: DescriptionWizardStep[] }>(url, {
      method: "POST",
      body: JSON.stringify({ category }),
    });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to get wizard steps");
  }
  return response.json();
}

export async function generateEventDescription(context: DescriptionContext): Promise<GeneratedDescription> {
  return apiFetch<GeneratedDescription>(`${API_URL}/api/ai/description/generate`, {
    method: "POST",
    body: JSON.stringify(context),
  });
}

export async function regenerateEventDescription(
  context: DescriptionContext,
  feedback: string
): Promise<GeneratedDescription> {
  return apiFetch<GeneratedDescription>(`${API_URL}/api/ai/description/regenerate`, {
    method: "POST",
    body: JSON.stringify({ ...context, feedback }),
  });
}

// ── Reviews ─────────────────────────────────────────────────────────

export interface EventReview {
  _id: string;
  "@type": "Review";
  itemReviewed: string;
  author: string;
  reviewRating: Rating;
  reviewBody?: string;
  datePublished: string;
  helpfulCount: number;
  isVerifiedAttendee: boolean;
  // Enriched fields
  authorName?: string;
  authorInitials?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface EventReviewsResponse {
  reviews: EventReview[];
  stats: ReviewStats;
}

export async function getEventReviews(eventId: string): Promise<EventReviewsResponse> {
  return apiFetch<EventReviewsResponse>(`/api/events/${eventId}/reviews`);
}

export async function submitEventReview(
  eventId: string,
  data: { ratingValue: number; reviewBody?: string }
): Promise<{ review: EventReview }> {
  return apiFetch<{ review: EventReview }>(`/api/events/${eventId}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function markReviewHelpful(reviewId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/reviews/${reviewId}/helpful`, {
    method: "POST",
  });
}

// ── Event Stats ─────────────────────────────────────────────────────

export interface EventStats {
  views: number;
  rsvps: number;
  checkins: number;
  referralClicks: number;
  topSources?: Array<{ source: string; count: number }>;
  topCities?: Array<{ city: string; count: number }>;
  isHot?: boolean;
  isTrending?: boolean;
  trend?: number;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  return apiFetch<EventStats>(`/api/events/${eventId}/stats`);
}

// ── Referrals ───────────────────────────────────────────────────────

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userInitials: string;
  referralCount: number;
  conversionCount: number;
}

export async function getEventReferralLeaderboard(eventId: string): Promise<ReferralLeaderboardEntry[]> {
  const response = await apiFetch<{ leaderboard: ReferralLeaderboardEntry[] }>(`/api/events/${eventId}/referrals`);
  return response.leaderboard;
}

export async function trackReferral(data: {
  referralCode: string;
  eventId?: string;
  referredUserId?: string;
}): Promise<{ referral: { _id: string } }> {
  return apiFetch<{ referral: { _id: string } }>("/api/referrals/track", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface UserReferralCode {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  dateCreated: string;
}

export async function getUserReferralCode(userId: string): Promise<UserReferralCode | null> {
  try {
    return await apiFetch<UserReferralCode>(`/api/users/${userId}/referral-code`);
  } catch {
    return null;
  }
}

export async function generateUserReferralCode(userId: string): Promise<UserReferralCode> {
  return apiFetch<UserReferralCode>(`/api/users/${userId}/referral-code`, {
    method: "POST",
  });
}

// ── Host Reputation ─────────────────────────────────────────────────

export interface HostReputation {
  userId: string;
  name: string;
  alternateName?: string;
  initials: string;
  eventsHosted: number;
  totalAttendees: number;
  avgAttendance: number;
  rating: number;
  reviewCount: number;
  badges: string[];
}

export async function getHostReputation(userId: string): Promise<HostReputation | null> {
  try {
    return await apiFetch<HostReputation>(`/api/users/${userId}/reputation`);
  } catch {
    return null;
  }
}

// ── Community Stats ─────────────────────────────────────────────────

export interface CommunityStats {
  totalEvents: number;
  totalAttendees: number;
  activeHosts: number;
  trendingCategories: Array<{
    category: string;
    count: number;
    attendees: number;
  }>;
  popularVenues: Array<{
    venue: string;
    count: number;
  }>;
  peakTime?: string;
}

export async function getCommunityStats(city?: string): Promise<CommunityStats> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  return apiFetch<CommunityStats>(`/api/community/stats${params}`);
}

// ── Trending Events ─────────────────────────────────────────────────

export interface TrendingEvent extends Event {
  views: number;
  trend: number;
  isHot: boolean;
}

export async function getTrendingEvents(params?: {
  city?: string;
  limit?: number;
}): Promise<TrendingEvent[]> {
  const searchParams = new URLSearchParams();
  if (params?.city) searchParams.set("city", params.city);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const query = searchParams.toString();
  const response = await apiFetch<{ events: TrendingEvent[] }>(`/api/events/trending${query ? `?${query}` : ""}`);
  return response.events;
}
