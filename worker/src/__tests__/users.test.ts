/**
 * Users Route Tests
 *
 * Tests GET/POST/DELETE operations for /api/users endpoints,
 * including public profile retrieval, user creation, and soft-deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import {
  createMockEnv,
  createMockD1,
  createMockD1Statement,
  createRequest,
  createUserFixture,
} from './mocks';

describe('GET /api/users/:id', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('returns public user fields', async () => {
    const user = createUserFixture({ _id: 'usr-123', name: 'Jane Doe' });

    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(user),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/users/usr-123');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { user: { id: string; name: string } };
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe('usr-123');
    expect(data.user.name).toBe('Jane Doe');
  });

  it('returns 404 for unknown user', async () => {
    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/users/nonexistent');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('User not found');
  });

  it('looks up user by alternate_name', async () => {
    const user = createUserFixture({ _id: 'usr-456', name: 'John Smith' });

    const statement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(user),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const request = createRequest('http://localhost:8787/api/users/johnsmith');
    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);

    // Verify the query binds both the id and alternate_name
    expect(statement.bind).toHaveBeenCalledWith('johnsmith', 'johnsmith');
  });
});

describe('POST /api/users', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('creates user with valid data and trusted origin', async () => {
    const statement = createMockD1Statement();
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const userBody = {
      email: 'newuser@example.com',
      name: 'New User',
      alternateName: 'newuser',
      addressLocality: 'Harare',
      addressCountry: 'Zimbabwe',
      interests: ['Tech', 'Music'],
    };

    const request = createRequest(
      'http://localhost:8787/api/users',
      { method: 'POST', body: JSON.stringify(userBody) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
    const data = await response.json() as { id: string; message: string };
    expect(data.message).toBe('User created successfully');
    expect(data.id).toBeDefined();
  });

  it('creates user with minimal fields', async () => {
    const statement = createMockD1Statement();
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const userBody = {
      email: 'minimal@example.com',
      name: 'Minimal User',
    };

    const request = createRequest(
      'http://localhost:8787/api/users',
      { method: 'POST', body: JSON.stringify(userBody) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
    const data = await response.json() as { id: string; message: string };
    expect(data.id).toBeDefined();

    // Verify null values were bound for optional fields
    expect(statement.bind).toHaveBeenCalledWith(
      expect.any(String),   // generated id
      'minimal@example.com',
      'Minimal User',
      null,                 // alternate_name
      null,                 // address_locality
      null,                 // address_country
      '[]'                  // interests defaults to empty array
    );
  });

  it('rejects create without auth', async () => {
    const userBody = {
      email: 'unauthorized@example.com',
      name: 'Unauthorized User',
    };

    const request = createRequest(
      'http://localhost:8787/api/users',
      {
        method: 'POST',
        body: JSON.stringify(userBody),
        origin: 'https://evil.com',
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Unauthorized');
  });

  it('allows create from trusted origin', async () => {
    const statement = createMockD1Statement();
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(statement) });
    env = createMockEnv({ DB: db });

    const userBody = {
      email: 'trusted@example.com',
      name: 'Trusted User',
    };

    const request = createRequest(
      'http://localhost:8787/api/users',
      {
        method: 'POST',
        body: JSON.stringify(userBody),
        origin: 'https://nhimbe.com',
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(201);
  });
});

describe('DELETE /api/users/:id', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('soft-deletes user and anonymizes PII', async () => {
    const findStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ _id: 'usr-del', email: 'delete@example.com' }),
    });
    const writeStatement = createMockD1Statement();

    const db = createMockD1();
    let callCount = 0;
    (db.prepare as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return findStatement;  // user lookup
      return writeStatement;                       // update user + cancel registrations + audit log
    });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/users/usr-del',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const data = await response.json() as { message: string };
    expect(data.message).toBe('User account deleted successfully');

    // Verify multiple DB operations happened (user update, registration cancellation, audit log)
    expect(db.prepare).toHaveBeenCalledTimes(4);
  });

  it('returns 404 when deleting nonexistent user', async () => {
    const findStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    const db = createMockD1({ prepare: vi.fn().mockReturnValue(findStatement) });
    env = createMockEnv({ DB: db });

    const request = createRequest(
      'http://localhost:8787/api/users/usr-nonexistent',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(404);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('User not found');
  });

  it('rejects delete without auth', async () => {
    const request = createRequest(
      'http://localhost:8787/api/users/usr-del',
      { method: 'DELETE', origin: 'https://evil.com' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(401);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Unauthorized');
  });

  it('cancels active registrations on delete', async () => {
    const findStatement = createMockD1Statement({
      first: vi.fn().mockResolvedValue({ _id: 'usr-regs', email: 'regs@example.com' }),
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
      'http://localhost:8787/api/users/usr-regs',
      { method: 'DELETE' }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.status).toBe(200);

    // The second prepare call should be the user PII update, third is the registration cancellation
    // Verify registration cancellation query was issued (bind with timestamp and userId)
    expect(writeStatement.bind).toHaveBeenCalledWith(
      expect.any(String),  // ISO timestamp
      'usr-regs'
    );
  });
});
