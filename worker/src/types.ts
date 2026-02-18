/**
 * nhimbe API Type Definitions
 * Cloudflare Workers environment with AI, Vectorize, D1, and KV bindings
 */

// Cloudflare AI Types
export interface Ai {
  run(
    model: string,
    inputs: AiTextGenerationInput | AiTextEmbeddingsInput
  ): Promise<AiTextGenerationOutput | AiTextEmbeddingsOutput>;
}

export interface AiTextGenerationInput {
  prompt?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AiTextGenerationOutput {
  response?: string;
  // Streaming returns ReadableStream
}

export interface AiTextEmbeddingsInput {
  text: string | string[];
}

export interface AiTextEmbeddingsOutput {
  shape: number[];
  data: number[][];
}

// Vectorize Types
export interface VectorizeIndex {
  insert(vectors: VectorizeVector[]): Promise<VectorizeInsertResult>;
  upsert(vectors: VectorizeVector[]): Promise<VectorizeInsertResult>;
  query(
    vector: number[],
    options?: VectorizeQueryOptions
  ): Promise<VectorizeQueryResult>;
  getByIds(ids: string[]): Promise<VectorizeVector[]>;
  deleteByIds(ids: string[]): Promise<VectorizeDeleteResult>;
}

export interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
  namespace?: string;
}

export interface VectorizeQueryOptions {
  topK?: number;
  filter?: Record<string, string | number | boolean>;
  returnValues?: boolean;
  returnMetadata?: boolean;
  namespace?: string;
}

export interface VectorizeQueryResult {
  matches: VectorizeMatch[];
  count: number;
}

export interface VectorizeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, string | number | boolean>;
}

export interface VectorizeInsertResult {
  count: number;
  ids: string[];
}

export interface VectorizeDeleteResult {
  count: number;
  ids: string[];
}

// D1 Database Types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    served_by: string;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// KV Namespace Types
export interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<unknown | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: KVPutOptions
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
  cacheTtl?: number;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
  list_complete: boolean;
  cursor?: string;
}

// R2 Bucket Types
export interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2ListOptions {
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  limit?: number;
  include?: ("httpMetadata" | "customMetadata")[];
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

// Cloudflare Images Types
export interface ImagesBinding {
  input(stream: ReadableStream): ImageInput;
}

export interface ImageInput {
  transform(options: ImageTransformOptions): ImageTransformed;
}

export interface ImageTransformed {
  draw(image: ImageInput | ReadableStream, options?: ImageDrawOptions): ImageTransformed;
  output(options?: ImageOutputOptions): Promise<ReadableStream>;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  gravity?: "auto" | "left" | "right" | "top" | "bottom" | "center";
  quality?: number;
  blur?: number;
  rotate?: 90 | 180 | 270;
  sharpen?: number;
  brightness?: number;
  contrast?: number;
  format?: "avif" | "webp" | "json" | "jpeg" | "png";
}

export interface ImageDrawOptions {
  opacity?: number;
  repeat?: boolean | "x" | "y";
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  width?: number;
  height?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  gravity?: "auto" | "left" | "right" | "top" | "bottom" | "center";
  rotate?: number;
}

export interface ImageOutputOptions {
  format?: "avif" | "webp" | "json" | "jpeg" | "png";
  quality?: number;
}

// Analytics Engine Types
export interface AnalyticsEngineDataset {
  writeDataPoint(event: AnalyticsEngineDataPoint): void;
}

export interface AnalyticsEngineDataPoint {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

// Queue Types
export interface Queue<T = unknown> {
  send(message: T, options?: QueueSendOptions): Promise<void>;
  sendBatch(messages: QueueSendBatchMessage<T>[]): Promise<void>;
}

export interface QueueSendOptions {
  contentType?: "json" | "text" | "bytes" | "v8";
  delaySeconds?: number;
}

export interface QueueSendBatchMessage<T> {
  body: T;
  contentType?: "json" | "text" | "bytes" | "v8";
  delaySeconds?: number;
}

export interface MessageBatch<T = unknown> {
  queue: string;
  messages: Message<T>[];
  ackAll(): void;
  retryAll(): void;
}

export interface Message<T = unknown> {
  id: string;
  timestamp: Date;
  body: T;
  ack(): void;
  retry(): void;
}

// Rate Limiter Types
export interface RateLimiter {
  limit(options: RateLimitOptions): Promise<RateLimitOutcome>;
}

export interface RateLimitOptions {
  key: string;
}

export interface RateLimitOutcome {
  success: boolean;
}

// Hono app variables (set by middleware, available to all handlers)
export interface AppVariables {
  requestId: string;
}

// Environment Bindings
export interface Env {
  ENVIRONMENT: string;
  API_KEY: string;
  ALLOWED_ORIGINS?: string;
  // Stytch (frontend SDK handles auth; backend only needs project ID for local JWT validation)
  STYTCH_PROJECT_ID: string;
  // Cloudflare bindings
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA: R2Bucket;
  IMAGES: ImagesBinding;
  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;
  // Queues
  ANALYTICS_QUEUE: Queue<AnalyticsQueueMessage>;
  EMAIL_QUEUE: Queue<EmailQueueMessage>;
  // Rate Limiter
  RATE_LIMITER: RateLimiter;
}

// Queue Message Types
export interface AnalyticsQueueMessage {
  type: "view" | "rsvp" | "referral" | "review";
  eventId: string;
  userId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface EmailQueueMessage {
  type: "event_reminder" | "feedback_request" | "welcome" | "rsvp_confirmation";
  to: string;
  subject: string;
  templateData: Record<string, unknown>;
}

// Event Types (matching frontend)
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
  createdAt?: string;
  updatedAt?: string;
}

// Search Types
export interface SearchQuery {
  query: string;
  filters?: {
    city?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  limit?: number;
}

export interface SearchResult {
  events: Event[];
  query: string;
  aiSummary?: string;
  totalResults: number;
}

// AI Assistant Types
export interface AssistantMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AssistantRequest {
  message: string;
  conversationHistory?: AssistantMessage[];
  context?: {
    userLocation?: string;
    userInterests?: string[];
  };
}

export interface AssistantResponse {
  message: string;
  suggestedEvents?: Event[];
  actions?: Array<{
    type: "search" | "navigate" | "create";
    payload: unknown;
  }>;
}

// User Role Types
export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  country?: string;
  interests?: string[];
  eventsAttended: number;
  eventsHosted: number;
  role: UserRole;
  onboardingCompleted: boolean;
  stytchUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// Role permission helpers
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Support Ticket Types
export interface SupportTicket {
  id: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'pending' | 'resolved';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'admin';
  senderId?: string;
  senderName: string;
  content: string;
  createdAt: string;
}

// Open Data Types - Reviews, Referrals, Reputation

export interface EventReview {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userInitials: string;
  rating: number;
  comment?: string;
  helpfulCount: number;
  isVerifiedAttendee: boolean;
  createdAt: string;
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

export interface Referral {
  id: string;
  eventId: string;
  referrerUserId: string;
  referredUserId?: string;
  referralCode: string;
  status: "pending" | "converted" | "expired";
  createdAt: string;
  convertedAt?: string;
}

export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userInitials: string;
  referralCount: number;
  conversionCount: number;
}

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

export interface CommunityStats {
  city?: string;
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
