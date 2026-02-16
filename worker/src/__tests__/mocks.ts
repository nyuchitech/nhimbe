/**
 * Shared mock factories for nhimbe worker tests
 *
 * Tiered architecture:
 *   Layer 1: Mock primitives (D1, KV, R2, Vectorize, AI)
 *   Layer 2: Environment factory (combines all bindings)
 *   Layer 3: Request/response builders
 *   Layer 4: Domain fixtures (events, users, registrations)
 */

import type {
  Env,
  Event,
  D1Database,
  D1PreparedStatement,
  D1Result,
  KVNamespace,
  R2Bucket,
  VectorizeIndex,
  VectorizeQueryResult,
  Ai,
  AnalyticsEngineDataset,
  Queue,
  RateLimiter,
  ImagesBinding,
  UserRole,
} from '../types';

// ============================================
// Layer 1: Mock Primitives
// ============================================

export function createMockD1Statement(overrides?: Partial<D1PreparedStatement>): D1PreparedStatement {
  const statement: D1PreparedStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    all: vi.fn().mockResolvedValue({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    raw: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  // Make bind() return the same mock so chaining works
  (statement.bind as ReturnType<typeof vi.fn>).mockReturnValue(statement);
  return statement;
}

export function createMockD1(overrides?: Partial<D1Database>): D1Database {
  const statement = createMockD1Statement();
  return {
    prepare: vi.fn().mockReturnValue(statement),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
    ...overrides,
  };
}

export function createMockKV(store: Record<string, string> = {}): KVNamespace {
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store[key] || null)),
    put: vi.fn().mockImplementation((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
  } as unknown as KVNamespace;
}

export function createMockR2(): R2Bucket {
  return {
    head: vi.fn().mockResolvedValue(null),
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue({ key: 'test', version: '1', size: 0, etag: '', httpEtag: '', uploaded: new Date() }),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [], truncated: false, delimitedPrefixes: [] }),
  } as unknown as R2Bucket;
}

export function createMockVectorize(matches: VectorizeQueryResult['matches'] = []): VectorizeIndex {
  return {
    insert: vi.fn().mockResolvedValue({ count: 0, ids: [] }),
    upsert: vi.fn().mockResolvedValue({ count: 0, ids: [] }),
    query: vi.fn().mockResolvedValue({ matches, count: matches.length }),
    getByIds: vi.fn().mockResolvedValue([]),
    deleteByIds: vi.fn().mockResolvedValue({ count: 0, ids: [] }),
  };
}

export function createMockAI(response: string = 'mock response'): Ai {
  return {
    run: vi.fn().mockResolvedValue({ response, data: [[0.1, 0.2, 0.3]] }),
  };
}

export function createMockAnalytics(): AnalyticsEngineDataset {
  return {
    writeDataPoint: vi.fn(),
  };
}

export function createMockQueue<T = unknown>(): Queue<T> {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockRateLimiter(success = true): RateLimiter {
  return {
    limit: vi.fn().mockResolvedValue({ success }),
  };
}

export function createMockImages(): ImagesBinding {
  return {
    input: vi.fn().mockReturnValue({
      transform: vi.fn().mockReturnValue({
        draw: vi.fn().mockReturnThis(),
        output: vi.fn().mockResolvedValue(new ReadableStream()),
      }),
    }),
  };
}

// ============================================
// Layer 2: Environment Factory
// ============================================

export function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    ENVIRONMENT: 'test',
    API_KEY: 'test-api-key-12345',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    STYTCH_PROJECT_ID: 'project-test-12345',
    AI: createMockAI(),
    VECTORIZE: createMockVectorize(),
    DB: createMockD1(),
    CACHE: createMockKV(),
    MEDIA: createMockR2(),
    IMAGES: createMockImages(),
    ANALYTICS: createMockAnalytics(),
    ANALYTICS_QUEUE: createMockQueue(),
    EMAIL_QUEUE: createMockQueue(),
    RATE_LIMITER: createMockRateLimiter(),
    ...overrides,
  };
}

// ============================================
// Layer 3: Request / Response Builders
// ============================================

export function createRequest(
  url: string,
  options: RequestInit & { origin?: string } = {}
): Request {
  const { origin = 'http://localhost:3000', ...init } = options;
  const headers = new Headers(init.headers);
  if (origin) headers.set('Origin', origin);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return new Request(url, { ...init, headers });
}

export function createAuthenticatedRequest(
  url: string,
  token: string = 'valid-jwt-token',
  options: RequestInit & { origin?: string } = {}
): Request {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return createRequest(url, { ...options, headers });
}

export function createApiKeyRequest(
  url: string,
  apiKey: string = 'test-api-key-12345',
  options: RequestInit & { origin?: string } = {}
): Request {
  const headers = new Headers(options.headers);
  headers.set('X-API-Key', apiKey);
  return createRequest(url, { ...options, headers });
}

// ============================================
// Layer 4: Domain Fixtures
// ============================================

export function createEventFixture(overrides?: Partial<Event>): Event {
  return {
    id: 'evt-test-001',
    shortCode: 'abc12345',
    slug: 'test-event',
    title: 'Test Event',
    description: 'A test event for unit testing',
    date: {
      day: '15',
      month: 'Mar',
      full: 'Saturday, March 15, 2026',
      time: '2:00 PM',
      iso: '2026-03-15T14:00:00Z',
    },
    location: {
      venue: 'Test Venue',
      address: '123 Test St',
      city: 'Harare',
      country: 'Zimbabwe',
    },
    category: 'Tech',
    tags: ['testing', 'vitest'],
    attendeeCount: 42,
    host: {
      name: 'Test Host',
      handle: 'testhost',
      initials: 'TH',
      eventCount: 5,
    },
    isFree: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createEventDbRow(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'evt-test-001',
    short_code: 'abc12345',
    slug: 'test-event',
    title: 'Test Event',
    description: 'A test event for unit testing',
    date_day: '15',
    date_month: 'Mar',
    date_full: 'Saturday, March 15, 2026',
    date_time: '2:00 PM',
    date_iso: '2026-03-15T14:00:00Z',
    location_venue: 'Test Venue',
    location_address: '123 Test St',
    location_city: 'Harare',
    location_country: 'Zimbabwe',
    category: 'Tech',
    tags: '["testing","vitest"]',
    cover_image: null,
    cover_gradient: null,
    attendee_count: 42,
    friends_count: null,
    capacity: 100,
    is_online: false,
    meeting_url: null,
    meeting_platform: null,
    host_name: 'Test Host',
    host_handle: 'testhost',
    host_initials: 'TH',
    host_event_count: 5,
    is_free: true,
    ticket_url: null,
    price_amount: null,
    price_currency: null,
    price_label: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createUserFixture(overrides?: Partial<{ id: string; email: string; name: string; role: UserRole; stytch_user_id: string; onboarding_completed: boolean }>) {
  return {
    id: 'usr-test-001',
    email: 'test@example.com',
    name: 'Test User',
    handle: 'testuser',
    avatar_url: null,
    bio: null,
    city: 'Harare',
    country: 'Zimbabwe',
    interests: '["Tech","Music"]',
    events_attended: 3,
    events_hosted: 1,
    role: 'user' as UserRole,
    onboarding_completed: true,
    stytch_user_id: 'stytch-user-test-001',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createRegistrationFixture(overrides?: Record<string, unknown>) {
  return {
    id: 'reg-test-001',
    event_id: 'evt-test-001',
    user_id: 'usr-test-001',
    status: 'registered',
    ticket_type: 'general',
    ticket_price: null,
    ticket_currency: null,
    registered_at: '2026-01-15T10:00:00Z',
    cancelled_at: null,
    ...overrides,
  };
}
