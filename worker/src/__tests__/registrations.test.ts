/**
 * Registrations Route Tests
 *
 * Tests GET/POST/DELETE operations for /api/registrations endpoints,
 * including duplicate prevention, capacity checks, and cancellation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import {
  createMockEnv,
  createMockD1,
  createMockD1Statement,
  createRequest,
  createRegistrationFixture,
} from './mocks';

describe('GET /api/registrations', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('returns registrations for an event', async () => {
    const reg1 = createRegistrationFixture({ id: 'reg-1' });
    const reg2 = createRegistrationFixture({ id: 'reg-2', user_id: 'usr-002' });

    const statement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({
        results: [reg1, reg2],
        success: true,
        meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' },
      }),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/registrations?event_id=evt-test-001');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { registrations: unknown[] };
    expect(data.registrations).toHaveLength(2);
  });

  it('returns registrations for a user', async () => {
    const reg = createRegistrationFixture();

    const statement = createMockD1Statement({
      all: vi.fn().mockResolvedValue({
        results: [reg],
        success: true,
        meta: { duration: 0, changes: 0, last_row_id: 0, served_by: 'test' },
      }),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/registrations?user_id=usr-test-001');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { registrations: unknown[] };
    expect(data.registrations).toHaveLength(1);
  });

  it('returns 400 when neither event_id nor user_id provided', async () => {
    const request = createRequest('http://localhost:8787/api/registrations');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('event_id or user_id required');
  });
});

describe('POST /api/registrations', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('creates registration successfully', async () => {
    // Mock: event lookup returns a valid published event with capacity
    const eventLookup = createMockD1Statement({
      first: vi.fn().mockResolvedValue({
        _id: 'evt-1',
        maximum_attendee_capacity: 100,
        attendee_count: 10,
        is_published: 1,
        event_status: 'EventScheduled',
      }),
    });
    // Mock: duplicate check returns null (no existing registration)
    const dupCheck = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    // Mock: atomic capacity update (returns changes: 1 to indicate success)
    const capacityUpdate = createMockD1Statement({
      run: vi.fn().mockResolvedValue({ results: [], success: true, meta: { duration: 0, changes: 1, last_row_id: 0, served_by: 'test' } }),
    });
    // Mock: insert registration
    const writeStatement = createMockD1Statement();

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventLookup;   // event lookup
      if (callCount === 2) return dupCheck;       // duplicate check
      if (callCount === 3) return capacityUpdate; // atomic capacity update
      return writeStatement;                       // insert registration
    });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-1', user_id: 'usr-1' }),
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
    const data = await response.json() as { id: string; message: string };
    expect(data.message).toBe('Registration successful');
    expect(data.id).toBeDefined();
  });

  it('prevents duplicate registration', async () => {
    const eventLookup = createMockD1Statement({
      first: vi.fn().mockResolvedValue({
        _id: 'evt-1',
        maximum_attendee_capacity: 100,
        attendee_count: 10,
        is_published: 1,
        event_status: 'EventScheduled',
      }),
    });
    // Duplicate check returns an existing registration
    const dupCheck = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ id: 'reg-existing' }),
    });

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventLookup;
      return dupCheck;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-1', user_id: 'usr-1' }),
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('User is already registered for this event');
  });

  it('rejects when event is at capacity', async () => {
    const eventLookup = createMockD1Statement({
      first: vi.fn().mockResolvedValue({
        _id: 'evt-full',
        maximum_attendee_capacity: 50,
        attendee_count: 50,
        is_published: 1,
        event_status: 'EventScheduled',
      }),
    });

    const db = createMockD1();
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue(eventLookup);
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-full', user_id: 'usr-1' }),
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Event is at capacity');
  });

  it('rejects when event is not found', async () => {
    const eventLookup = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });

    const db = createMockD1();
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue(eventLookup);
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-nope', user_id: 'usr-1' }),
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Event not found');
  });

  it('rejects when required fields are missing', async () => {
    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-1' }),  // missing user_id
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toContain('Missing required field');
  });

  it('rejects create without auth', async () => {
    const request = createRequest(
      'http://localhost:8787/api/registrations',
      {
        method: 'POST',
        body: JSON.stringify({ event_id: 'evt-1', user_id: 'usr-1' }),
        origin: 'https://evil.com',
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
  });
});

describe('DELETE /api/registrations/:id', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('cancels registration and decrements attendee count', async () => {
    // First call: find registration; subsequent calls: update registration + update event
    const findStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ id: 'reg-1', event_id: 'evt-1' }),
    });
    const writeStatement = createMockD1Statement();

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return findStatement;
      return writeStatement;
    });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations/reg-1',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { message: string };
    expect(data.message).toBe('Registration cancelled');

    // Verify the update queries were executed (update registration + decrement attendee)
    expect(db.prepare).toHaveBeenCalledTimes(3);
  });

  it('returns success even when registration does not exist', async () => {
    // When reg is not found, the route still returns success
    const findStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });

    const db = createMockD1();
    (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue(findStatement);
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/registrations/reg-nonexistent',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { message: string };
    expect(data.message).toBe('Registration cancelled');
  });
});
