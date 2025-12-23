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

// Environment Bindings
export interface Env {
  ENVIRONMENT: string;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  DB: D1Database;
  CACHE: KVNamespace;
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
  host: EventHost;
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
