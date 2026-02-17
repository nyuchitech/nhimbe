/**
 * nhimbe Schema.org Type Definitions
 *
 * All data types follow schema.org vocabulary from the ground up.
 * These interfaces define both MongoDB document shapes and API response shapes.
 * Field names match schema.org properties wherever a mapping exists.
 *
 * @see https://schema.org/Event
 * @see https://schema.org/Person
 * @see https://schema.org/Review
 * @see https://schema.org/Place
 * @see https://schema.org/Offer
 */

// ── Schema.org Location Types ──────────────────────────────────────

export interface SchemaPostalAddress {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressCountry: string;
}

export interface SchemaPlace {
  "@type": "Place";
  name: string;
  address: SchemaPostalAddress;
}

export interface SchemaVirtualLocation {
  "@type": "VirtualLocation";
  url: string;
}

// ── Schema.org Organizer (Person subset for event embedding) ───────

export interface SchemaOrganizer {
  "@type": "Person";
  name: string;
  identifier?: string;
  alternateName?: string;
  /** nhimbe extension: initials for avatar fallback */
  initials?: string;
  /** nhimbe extension: number of events hosted */
  eventCount?: number;
}

// ── Schema.org Offer ────────────────────────────────────────────────

export interface SchemaOffer {
  "@type": "Offer";
  price: number;
  priceCurrency: string;
  url?: string;
  availability: string;
}

// ── Schema.org Rating ───────────────────────────────────────────────

export interface SchemaRating {
  "@type": "Rating";
  ratingValue: number;
  bestRating: number;
  worstRating: number;
}

export interface SchemaAggregateRating {
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

export interface SchemaEvent {
  _id: string;
  "@type": "Event";

  // schema.org/Event core properties
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  eventAttendanceMode: EventAttendanceMode;
  eventStatus: EventStatus;
  image?: string;
  keywords: string[];
  maximumAttendeeCapacity?: number;
  location: SchemaPlace | SchemaVirtualLocation;
  organizer: SchemaOrganizer;
  offers?: SchemaOffer;
  aggregateRating?: SchemaAggregateRating;

  // nhimbe extensions (prefixed or clearly non-schema.org)
  shortCode: string;
  slug: string;
  category: string;
  attendeeCount: number;
  friendsCount?: number;
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

  // schema.org timestamps
  dateCreated: string;
  dateModified: string;
}

// ── Person (schema.org/Person) ──────────────────────────────────────

export type UserRole = "user" | "moderator" | "admin" | "super_admin";

export interface SchemaPerson {
  _id: string;
  "@type": "Person";

  // schema.org/Person core properties
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

  // nhimbe extensions
  interests?: string[];
  eventsAttended: number;
  eventsHosted: number;
  role: UserRole;

  // Auth providers
  stytchUserId?: string;
  mukokoOrgMemberId?: string;
  authProvider?: "email" | "mukoko_id";
  emailVerified: boolean;
  onboardingCompleted: boolean;
  lastLoginAt?: string;

  // schema.org timestamps
  dateCreated: string;
  dateModified: string;
}

// ── Review (schema.org/Review) ──────────────────────────────────────

export interface SchemaReview {
  _id: string;
  "@type": "Review";

  // schema.org/Review core properties
  itemReviewed: string;
  author: string;
  reviewRating: SchemaRating;
  reviewBody?: string;
  datePublished: string;

  // nhimbe extensions
  helpfulCount: number;
  isVerifiedAttendee: boolean;
  dateModified: string;
}

// ── Registration (inspired by schema.org/RsvpAction) ────────────────

export type RsvpResponse =
  | "pending"
  | "registered"
  | "approved"
  | "rejected"
  | "cancelled"
  | "attended";

export interface SchemaRegistration {
  _id: string;

  // schema.org-aligned
  event: string;
  agent: string;
  rsvpResponse: RsvpResponse;

  // Ticket info
  ticketType?: string;
  ticketPrice?: number;
  ticketCurrency?: string;

  // Timestamps
  dateCreated: string;
  dateCancelled?: string;
}

// ── Referral ────────────────────────────────────────────────────────

export type ReferralStatus = "pending" | "registered" | "attended";

export interface SchemaReferral {
  _id: string;
  referrerUserId: string;
  referredUserId?: string;
  event?: string;
  referralCode: string;
  source?: "link" | "email" | "social";
  status: ReferralStatus;
  dateCreated: string;
  convertedAt?: string;
}

export interface UserReferralCode {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  dateCreated: string;
}

// ── Host Stats ──────────────────────────────────────────────────────

export interface HostStats {
  userId: string;
  eventsHosted: number;
  totalAttendees: number;
  totalCapacity: number;
  avgAttendanceRate: number;
  totalReviews: number;
  avgRating: number;
  badges: string[];
  reputationScore: number;
  lastEventAt?: string;
  dateModified: string;
}

// ── Support ─────────────────────────────────────────────────────────

export type TicketCategory = "general" | "bug" | "feature" | "billing" | "other";
export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "pending" | "resolved";

export interface SupportTicket {
  _id: string;
  userId?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  dateCreated: string;
  dateModified: string;
}

export interface SupportMessage {
  _id: string;
  ticketId: string;
  senderType: "user" | "admin";
  senderId?: string;
  content: string;
  dateCreated: string;
}

// ── Analytics ───────────────────────────────────────────────────────

export interface AnalyticsEvent {
  _id: string;
  eventType: "view" | "rsvp" | "share" | "referral_click";
  eventId?: string;
  userId?: string;
  sessionId?: string;
  source?: "direct" | "referral" | "search" | "social";
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerUrl?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  dateCreated: string;
}

// ── Follows ─────────────────────────────────────────────────────────

export interface Follow {
  followerId: string;
  followingId: string;
  dateCreated: string;
}

// ── Role Hierarchy Helper ───────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ── Review Stats (computed, not stored) ─────────────────────────────

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// ── Referral Leaderboard Entry (computed) ───────────────────────────

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userInitials: string;
  referralCount: number;
  conversionCount: number;
}
