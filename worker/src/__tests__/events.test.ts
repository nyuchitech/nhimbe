/**
 * Events Route Tests
 *
 * Tests GET/POST/DELETE operations for /api/events endpoints,
 * including pagination, filtering, event creation, cancellation, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import {
  createMockEnv,
  createMockD1,
  createMockD1Statement,
  createRequest,
  createEventDbRow,
} from './mocks';

describe('GET /api/events', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('returns events list with pagination', async () => {
    const row1 = createEventDbRow({ _id: 'evt-1', name: 'Event One' });
    const row2 = createEventDbRow({ _id: 'evt-2', name: 'Event Two' });

    const countStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ total: 2 }),
    });
    const listStatement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({ results: [row1, row2], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    });

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      // First call is the COUNT query, second is the SELECT query
      return callCount === 1 ? countStatement : listStatement;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { events: unknown[]; pagination: { limit: number; offset: number; total: number } };
    expect(data.events).toHaveLength(2);
    expect(data.pagination).toEqual({ limit: 20, offset: 0, total: 2 });
  });

  it('returns empty list when no events exist', async () => {
    const countStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ total: 0 }),
    });
    const listStatement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({ results: [], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    });

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? countStatement : listStatement;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { events: unknown[]; pagination: { total: number } };
    expect(data.events).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });

  it('filters by city', async () => {
    const row = createEventDbRow({ _id: 'evt-1', location_locality: 'Bulawayo' });

    const countStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ total: 1 }),
    });
    const listStatement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({ results: [row], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    });

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? countStatement : listStatement;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events?city=Bulawayo');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { events: unknown[] };
    expect(data.events).toHaveLength(1);

    // Verify the city param was bound
    expect(countStatement.bind).toHaveBeenCalledWith('Bulawayo');
  });

  it('filters by category', async () => {
    const row = createEventDbRow({ _id: 'evt-1', category: 'Music' });

    const countStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ total: 1 }),
    });
    const listStatement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({ results: [row], success: true, meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' } }),
    });

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? countStatement : listStatement;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events?category=Music');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { events: unknown[] };
    expect(data.events).toHaveLength(1);

    expect(countStatement.bind).toHaveBeenCalledWith('Music');
  });
});

describe('GET /api/events/:id', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('returns event by ID', async () => {
    const row = createEventDbRow({ _id: 'evt-123', name: 'Found Event' });

    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(row),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events/evt-123');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { event: { id: string; name: string } };
    expect(data.event).toBeDefined();
    expect(data.event.id).toBe('evt-123');
    expect(data.event.name).toBe('Found Event');
  });

  it('returns 404 for unknown ID', async () => {
    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/events/nonexistent');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Event not found');
  });
});

describe('POST /api/events', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('creates event with valid data and trusted origin', async () => {
    const statement = createMockD1Statement();
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const eventBody = {
      name: 'New Event',
      description: 'A brand new event',
      startDate: '2026-04-01T10:00:00Z',
      date: { day: '1', month: 'Apr', full: 'Wednesday, April 1, 2026', time: '10:00 AM' },
      location: { name: 'City Hall', addressLocality: 'Harare', addressCountry: 'Zimbabwe' },
      category: 'Tech',
      organizer: { name: 'Host Person', identifier: 'hostperson', initials: 'HP', eventCount: 0 },
    };

    const request = createRequest(
      'http://localhost:8787/api/events',
      { method: 'POST', body: JSON.stringify(eventBody) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
    const data = await response.json() as { event: { name: string }; message: string };
    expect(data.message).toBe('Event created successfully');
    expect(data.event.name).toBe('New Event');
  });

  it('rejects create without auth', async () => {
    const eventBody = { name: 'Unauthorized Event' };

    const request = createRequest(
      'http://localhost:8787/api/events',
      {
        method: 'POST',
        body: JSON.stringify(eventBody),
        origin: 'https://evil.com',
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Unauthorized');
  });
});

describe('POST /api/events/:id/cancel', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('cancels an existing scheduled event', async () => {
    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ _id: 'evt-cancel', event_status: 'EventScheduled' }),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/events/evt-cancel/cancel',
      { method: 'POST', body: JSON.stringify({}) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { eventId: string; eventStatus: string; message: string };
    expect(data.eventStatus).toBe('EventCancelled');
    expect(data.message).toBe('Event cancelled successfully');
  });

  it('returns 404 when cancelling nonexistent event', async () => {
    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/events/nonexistent/cancel',
      { method: 'POST', body: JSON.stringify({}) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Event not found');
  });

  it('returns 400 when event is already cancelled', async () => {
    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ _id: 'evt-done', event_status: 'EventCancelled' }),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/events/evt-done/cancel',
      { method: 'POST', body: JSON.stringify({}) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Event is already cancelled');
  });
});

describe('DELETE /api/events/:id', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('deletes event and removes from vector index', async () => {
    const statement = createMockD1Statement();
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/events/evt-delete',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { message: string };
    expect(data.message).toBe('Event deleted successfully');

    // Verify the vectorize index was cleaned up
    expect(env.VECTORIZE.deleteByIds).toHaveBeenCalledWith(['evt-delete']);
  });

  it('rejects delete without auth', async () => {
    const request = createRequest(
      'http://localhost:8787/api/events/evt-delete',
      { method: 'DELETE', origin: 'https://evil.com' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
  });
});
