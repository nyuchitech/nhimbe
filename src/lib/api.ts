/**
 * nhimbe API Client
 * Handles all communication with the Cloudflare Workers backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mukoko-nhimbe-api.nyuchi.workers.dev";

// Types matching backend
export interface EventLocation {
  venue: string;
  address: string;
  city: string;
  country: string;
}

export interface EventDate {
  day: string;
  month: string;
  full: string;
  time: string;
  iso: string;
}

export interface EventHost {
  name: string;
  handle: string;
  initials: string;
  eventCount: number;
}

export interface EventPrice {
  amount: number;
  currency: string;
  label: string;
}

export interface Event {
  id: string;
  shortCode: string;
  slug: string;
  title: string;
  description: string;
  date: EventDate;
  location: EventLocation;
  category: string;
  tags: string[];
  coverImage?: string;
  coverGradient?: string;
  attendeeCount: number;
  friendsCount?: number;
  capacity?: number;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: "zoom" | "google_meet" | "teams" | "other";
  host: EventHost;
  // Ticketing - free events on nhimbe, paid events link to external
  isFree?: boolean;
  ticketUrl?: string; // External ticketing URL for paid events
  // Legacy price field (deprecated)
  price?: EventPrice;
  friends?: { name: string; gradient: string }[];
  createdAt?: string;
  updatedAt?: string;
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

// API fetch wrapper
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
export async function getCities(): Promise<{ city: string; country: string }[]> {
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
  title: string;
  description: string;
  date: EventDate;
  location: EventLocation;
  category: string;
  tags: string[];
  coverImage?: string;
  coverGradient?: string;
  capacity?: number;
  isOnline?: boolean;
  meetingUrl?: string;
  meetingPlatform?: "zoom" | "google_meet" | "teams" | "other";
  host: EventHost;
  // Ticketing - free events on nhimbe, paid events link to external
  isFree?: boolean;
  ticketUrl?: string; // External ticketing URL for paid events
  // Legacy price field (deprecated)
  price?: EventPrice;
}

// Create a new event
export async function createEvent(event: CreateEventInput): Promise<{ event: Event; message: string }> {
  return apiFetch<{ event: Event; message: string }>("/api/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// Update an event
export async function updateEvent(id: string, updates: Partial<CreateEventInput>): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Delete an event
export async function deleteEvent(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/events/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// Registrations API
// ============================================

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "registered" | "approved" | "rejected" | "cancelled" | "attended";
  ticket_type?: string;
  ticket_price?: number;
  ticket_currency?: string;
  registered_at: string;
  cancelled_at?: string;
  // Joined user data (when available)
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface RegistrationsResponse {
  registrations: Registration[];
}

// Get registrations for an event
export async function getEventRegistrations(eventId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?event_id=${eventId}`);
  return response.registrations;
}

// Get registrations for a user
export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const response = await apiFetch<RegistrationsResponse>(`/api/registrations?user_id=${userId}`);
  return response.registrations;
}

// Register for an event (RSVP)
export async function registerForEvent(data: {
  event_id: string;
  user_id: string;
  ticket_type?: string;
  ticket_price?: number;
  ticket_currency?: string;
}): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
  id: string;
  email: string;
  name: string;
  handle?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  events_attended: number;
  events_hosted: number;
  created_at: string;
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
  handle?: string;
  city?: string;
  country?: string;
  interests?: string[];
}): Promise<{ id: string; message: string }> {
  return apiFetch<{ id: string; message: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================
// Event Views Tracking
// ============================================

export async function trackEventView(eventId: string, userId?: string): Promise<void> {
  try {
    await apiFetch("/api/events/" + eventId + "/view", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
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
