/**
 * nhimbe API Client
 * Handles all communication with the Cloudflare Workers backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://events-api.mukoko.com";

// Types matching backend (schema.org-aligned)
export interface EventLocation {
  type?: string;
  name: string;             // venue name
  streetAddress?: string;
  addressLocality: string;  // city
  addressCountry: string;
  url?: string;
}

export interface EventDate {
  day: string;
  month: string;
  full: string;
  time: string;
}

export interface EventOrganizer {
  name: string;
  alternateName?: string;
  initials: string;
  identifier?: string;      // handle/slug
  eventCount: number;
}

export interface EventOffers {
  price?: number;
  priceCurrency?: string;
  url?: string;
  availability?: string;
}

export interface Event {
  id: string;
  shortCode: string;
  slug: string;
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  date: EventDate;
  location: EventLocation;
  category: string;
  keywords: string[];
  image?: string;
  coverGradient?: string;
  themeId?: string;
  attendeeCount: number;
  friendsCount?: number;
  maximumAttendeeCapacity?: number;
  eventAttendanceMode?: string;
  eventStatus?: string;
  isPublished?: boolean;
  meetingUrl?: string;
  meetingPlatform?: string;
  organizer: EventOrganizer;
  offers?: EventOffers;
  friends?: { name: string; gradient: string }[];
  dateCreated?: string;
  dateModified?: string;
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
  cities: { addressLocality: string; addressCountry: string }[];
}

// Get session JWT from Stytch (when available in browser)
function getSessionJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Stytch stores session JWT in a cookie; we retrieve it via the SDK
    // This is a lightweight check — the actual token comes from StytchProvider
    return null; // Will be passed explicitly by callers
  } catch {
    return null;
  }
}

// API fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  sessionJwt?: string
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Attach auth token for authenticated requests
  const token = sessionJwt || getSessionJwt();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Events API
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

// Categories API
export async function getCategories(): Promise<Category[]> {
  const response = await apiFetch<CategoriesResponse>("/api/categories");
  return response.categories;
}

// Cities API
export async function getCities(): Promise<{ addressLocality: string; addressCountry: string }[]> {
  const response = await apiFetch<CitiesResponse>("/api/cities");
  return response.cities;
}

// Helper to get event by ID, slug, or shortCode (tries all three)
export async function findEvent(identifier: string): Promise<Event | null> {
  const result = await getEventById(identifier);
  return result?.event || null;
}

// Create event input type
export interface CreateEventInput {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  date: EventDate;
  location: EventLocation;
  category: string;
  keywords: string[];
  image?: string;
  coverGradient?: string;
  maximumAttendeeCapacity?: number;
  eventAttendanceMode?: string;
  eventStatus?: string;
  meetingUrl?: string;
  meetingPlatform?: string;
  organizer: EventOrganizer;
  offers?: EventOffers;
}

// Create a new event
export async function createEvent(event: CreateEventInput, sessionJwt?: string): Promise<{ event: Event; message: string }> {
  return apiFetch<{ event: Event; message: string }>("/api/events", {
    method: "POST",
    body: JSON.stringify(event),
  }, sessionJwt);
}

// Update an event
export async function updateEvent(id: string, updates: Partial<CreateEventInput>, sessionJwt?: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  }, sessionJwt);
}

// Delete an event
export async function deleteEvent(id: string, sessionJwt?: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "DELETE",
  }, sessionJwt);
}

// ============================================
// Registrations API
// ============================================

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: "pending" | "registered" | "approved" | "rejected" | "cancelled" | "attended";
  ticketType?: string;
  ticketPrice?: number;
  ticketCurrency?: string;
  registeredAt: string;
  cancelledAt?: string;
  checkedInAt?: string;
  // Joined user data (when available)
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export interface RegistrationsResponse {
  registrations: Registration[];
}

// Get registrations for an event
export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?eventId=${eventId}`);
  return response.registrations;
}

// Get registrations for a user
export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?userId=${userId}`);
  return response.registrations;
}

// Register for an event (RSVP)
export async function registerForEvent(data: {
  eventId: string;
  userId: string;
  ticketType?: string;
  ticketPrice?: number;
  ticketCurrency?: string;
}, sessionJwt?: string): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(data),
  }, sessionJwt);
}

// Update registration status (approve/reject)
export async function updateRegistrationStatus(
  registrationId: string,
  status: "approved" | "rejected" | "pending" | "registered"
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/registrations/${registrationId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// Cancel a registration
export async function cancelRegistration(registrationId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/registrations/${registrationId}`, {
    method: "DELETE",
  });
}

// ============================================
// Users API
// ============================================

export interface User {
  _id: string;
  email: string;
  name: string;
  alternateName?: string;
  image?: string;
  description?: string;
  addressLocality?: string;
  addressCountry?: string;
  interests?: string[];
  eventsAttended: number;
  eventsHosted: number;
  dateCreated: string;
}

// Get user by ID or handle
export async function getUser(idOrHandle: string): Promise<User | null> {
  try {
    const response = await apiFetch<{ user: User }>(`/api/users/${idOrHandle}`);
    return response.user;
  } catch {
    return null;
  }
}

// Create a new user
export async function createUser(data: {
  email: string;
  name: string;
  alternateName?: string;
  addressLocality?: string;
  addressCountry?: string;
  interests?: string[];
}): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update authenticated user's profile
export async function updateProfile(
  sessionJwt: string,
  fields: Partial<{ name: string; addressLocality: string; addressCountry: string; interests: string[] }>
): Promise<{ user: User }> {
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionJwt}`,
    },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string; reason?: string };
    console.error("[nhimbe] updateProfile failed:", response.status, errorData);
    throw new Error(errorData.error || "Failed to update profile");
  }

  return response.json();
}

// ============================================
// Event Views Tracking
// ============================================

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

// ============================================
// Media Upload (R2)
// ============================================

export interface UploadMediaResponse {
  key: string;
  url: string;
  message: string;
}

/**
 * Upload an image to R2 storage
 * @param file - The file to upload (must be an image)
 * @returns The storage key and URL of the uploaded file
 */
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

/**
 * Get the full URL for a media file
 * @param key - The storage key returned from uploadMedia
 * @param options - Optional image transformation options
 */
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

// ============================================
// AI Description Generator
// ============================================

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

/**
 * Get wizard steps for the description generator
 */
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

/**
 * Generate an event description using AI
 */
export async function generateEventDescription(context: DescriptionContext): Promise<GeneratedDescription> {
  return apiFetch<GeneratedDescription>(`${API_URL}/api/ai/description/generate`, {
    method: "POST",
    body: JSON.stringify(context),
  });
}

/**
 * Regenerate description with feedback
 */
export async function regenerateEventDescription(
  context: DescriptionContext,
  feedback: string
): Promise<GeneratedDescription> {
  return apiFetch<GeneratedDescription>(`${API_URL}/api/ai/description/regenerate`, {
    method: "POST",
    body: JSON.stringify({ ...context, feedback }),
  });
}

// ============================================
// Open Data APIs - Reviews, Referrals, Stats
// ============================================

// Event Review Types
export interface EventReview {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userInitials: string;
  rating: number;
  reviewBody?: string;
  helpfulCount: number;
  isVerifiedAttendee: boolean;
  dateCreated: string;
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

// Get reviews for an event (PUBLIC)
export async function getEventReviews(eventId: string): Promise<EventReviewsResponse> {
  return apiFetch<EventReviewsResponse>(`/api/events/${eventId}/reviews`);
}

// Submit a review for an event
export async function submitEventReview(
  eventId: string,
  data: { userId: string; rating: number; reviewBody?: string }
): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>(`/api/events/${eventId}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Mark a review as helpful
export async function markReviewHelpful(
  reviewId: string,
  userId: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/reviews/${reviewId}/helpful`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// Event Stats Types
export interface EventStats {
  eventId: string;
  views: number;
  uniqueViews: number;
  rsvps: number;
  checkins: number;
  referrals: number;
  trend?: number;
  isHot?: boolean;
  peakViewTime?: string;
  topSources?: Array<{ source: string; count: number }>;
  topCities?: Array<{ city: string; count: number }>;
}

// Get stats for an event (PUBLIC - Open Data)
export async function getEventStats(eventId: string): Promise<EventStats> {
  const response = await apiFetch<{ stats: EventStats }>(`/api/events/${eventId}/stats`);
  return response.stats;
}

// Tracked Links — masked URLs with click analytics
export interface TrackedLink {
  code: string;
  url: string; // relative: /r/{code}
}

// Create a tracked link that redirects through nhimbe for click analytics
export async function createTrackedLink(data: {
  targetUrl: string;
  eventId: string;
  linkType: "meeting_url" | "directions" | "ticket" | "website";
  createdBy?: string;
}): Promise<TrackedLink> {
  return apiFetch<TrackedLink>("/api/links", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get the full tracked URL for a code
export function getTrackedUrl(code: string): string {
  const siteUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "https://nhimbe.com");
  return `${siteUrl}/r/${code}`;
}

// Check-in Types
export interface CheckinStats {
  eventId: string;
  total: number;
  attended: number;
  remaining: number;
  rate: number;
}

// Check in a registration at an event
export async function checkinRegistration(
  eventId: string,
  registrationId: string
): Promise<{ message: string; registrationId: string }> {
  return apiFetch<{ message: string; registrationId: string }>(
    `/api/events/${eventId}/checkin`,
    { method: "POST", body: JSON.stringify({ registrationId }) }
  );
}

// Get check-in stats for an event
export async function getCheckinStats(eventId: string): Promise<CheckinStats> {
  return apiFetch<CheckinStats>(`/api/events/${eventId}/checkin/stats`);
}

// Kiosk Pairing Types
export type ScreenType = "kiosk" | "signage-host" | "signage-admin";

export interface KioskPairingStatus {
  status: "pending" | "confirmed" | "expired";
  screenType?: ScreenType;
  eventId?: string;
  eventName?: string;
  hostName?: string;
  sessionToken?: string;
}

export interface KioskSession {
  eventId: string;
  eventName: string;
  screenType: ScreenType;
  hostId: string | null;
  pairedAt: string;
}

// Request a pairing code for kiosk or signage screen
export async function requestKioskPairing(
  screenType: ScreenType = "kiosk"
): Promise<{ code: string; expiresIn: number; screenType: ScreenType }> {
  return apiFetch<{ code: string; expiresIn: number; screenType: ScreenType }>(
    "/api/kiosk/pair/request",
    { method: "POST", body: JSON.stringify({ screenType }) }
  );
}

// Poll for pairing status
export async function getKioskPairingStatus(code: string): Promise<KioskPairingStatus> {
  return apiFetch<KioskPairingStatus>(`/api/kiosk/pair/${code}/status`);
}

// Host confirms pairing
export async function confirmKioskPairing(
  code: string,
  eventId: string
): Promise<{ message: string; eventName: string; screenType: string; sessionToken: string }> {
  return apiFetch<{ message: string; eventName: string; screenType: string; sessionToken: string }>(
    `/api/kiosk/pair/${code}/confirm`,
    { method: "POST", body: JSON.stringify({ eventId }) }
  );
}

// Validate a session
export async function getKioskSession(token: string): Promise<{ session: KioskSession }> {
  return apiFetch<{ session: KioskSession }>(`/api/kiosk/session/${token}`);
}

// End a session
export async function endKioskSession(token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/kiosk/session/${token}`, {
    method: "DELETE",
  });
}


// Referral Types
export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userInitials: string;
  referralCount: number;
  conversionCount: number;
}

// Get referral leaderboard for an event (PUBLIC)
export async function getEventReferralLeaderboard(eventId: string): Promise<ReferralLeaderboardEntry[]> {
  const response = await apiFetch<{ leaderboard: ReferralLeaderboardEntry[] }>(`/api/events/${eventId}/referrals`);
  return response.leaderboard;
}

// Track a referral
export async function trackReferral(data: {
  eventId: string;
  referralCode: string;
  referredUserId?: string;
}): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>("/api/referrals/track", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// User Referral Code
export interface UserReferralCode {
  code: string;
  totalReferrals: number;
  totalConversions: number;
}

// Get user's referral code
export async function getUserReferralCode(userId: string): Promise<UserReferralCode | null> {
  try {
    return await apiFetch<UserReferralCode>(`/api/users/${userId}/referral-code`);
  } catch {
    return null;
  }
}

// Generate a referral code for user
export async function generateUserReferralCode(userId: string): Promise<{ code: string }> {
  return apiFetch<{ code: string }>(`/api/users/${userId}/referral-code`, {
    method: "POST",
  });
}

// Host Reputation Types
export interface HostStats {
  userId: string;
  name: string;
  handle?: string;
  initials: string;
  eventsHosted: number;
  totalAttendees: number;
  avgAttendance: number;
  rating: number;
  reviewCount: number;
  badges: string[];
  responseRate?: number;
  responseTime?: string;
}

// Get host reputation (PUBLIC)
export async function getHostReputation(userId: string): Promise<HostStats | null> {
  try {
    const response = await apiFetch<{ host: HostStats }>(`/api/users/${userId}/reputation`);
    return response.host;
  } catch {
    return null;
  }
}

// Community Stats Types
export interface CommunityStats {
  addressLocality?: string;
  totalEvents: number;
  totalAttendees: number;
  activeHosts: number;
  trendingCategories: Array<{
    category: string;
    change: number;
    events: number;
  }>;
  peakTime: string;
  popularVenues: Array<{
    venue: string;
    events: number;
  }>;
}

// Get community stats (PUBLIC)
export async function getCommunityStats(city?: string): Promise<CommunityStats> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  const response = await apiFetch<{ stats: CommunityStats }>(`/api/community/stats${params}`);
  return response.stats;
}

// Trending Events (includes views and trend data)
export interface TrendingEvent extends Event {
  views: number;
  trend: number;
  isHot: boolean;
}

// Get trending events
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
