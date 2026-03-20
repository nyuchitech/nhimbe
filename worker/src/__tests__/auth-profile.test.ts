/**
 * PATCH /api/auth/profile — Progressive Profile Updates
 *
 * Tests the UPSERT endpoint that updates an existing user
 * or inserts a new one for progressive onboarding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import {
  createMockEnv,
  createMockD1,
  createMockD1Statement,
  createAuthenticatedRequest,
} from './mocks';

// Mock the Stytch auth module
vi.mock('../auth/stytch', () => ({
  getAuthenticatedUser: vi.fn(),
  extractBearerToken: vi.fn(),
}));

import { getAuthenticatedUser } from '../auth/stytch';
const mockGetAuth = vi.mocked(getAuthenticatedUser);

describe('PATCH /api/auth/profile', () => {
  let env: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.restoreAllMocks();
    env = createMockEnv();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValue({
      user: null,
      failureReason: 'no_token',
      detail: 'No bearer token',
    });

    const request = createAuthenticatedRequest(
      'http://localhost:8787/api/auth/profile',
      'invalid-token',
      { method: 'PATCH', body: JSON.stringify({ name: 'Test' }) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(401);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when no fields provided', async () => {
    mockGetAuth.mockResolvedValue({
      user: { userId: 'stytch-123', email: 'test@example.com' },
      failureReason: null,
      detail: null,
    });

    const request = createAuthenticatedRequest(
      'http://localhost:8787/api/auth/profile',
      'valid-token',
      { method: 'PATCH', body: JSON.stringify({}) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(400);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('At least one field is required');
  });

  it('updates name for existing user and returns 200', async () => {
    mockGetAuth.mockResolvedValue({
      user: { userId: 'stytch-123', email: 'test@example.com' },
      failureReason: null,
      detail: null,
    });

    const existingDbUser = {
      _id: 'usr-001',
      email: 'test@example.com',
      name: 'Old Name',
      image: null,
      address_locality: 'Harare',
      address_country: 'Zimbabwe',
      interests: '["Tech"]',
      stytch_user_id: 'stytch-123',
      role: 'user',
      onboarding_completed: 1,
    };

    const updatedDbUser = {
      ...existingDbUser,
      name: 'New Name',
    };

    // Mock D1: first call = SELECT existing user, second call = UPDATE, third call = SELECT updated
    const selectExistingStmt = createMockD1Statement({
      first: vi.fn().mockResolvedValue(existingDbUser),
    });
    const updateStmt = createMockD1Statement();
    const selectUpdatedStmt = createMockD1Statement({
      first: vi.fn().mockResolvedValue(updatedDbUser),
    });

    const db = createMockD1();
    (db.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(selectExistingStmt)
      .mockReturnValueOnce(updateStmt)
      .mockReturnValueOnce(selectUpdatedStmt);

    env = createMockEnv({ DB: db });

    const request = createAuthenticatedRequest(
      'http://localhost:8787/api/auth/profile',
      'valid-token',
      { method: 'PATCH', body: JSON.stringify({ name: 'New Name' }) }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(200);

    const data = await response.json() as { user: { name: string; city: string; id: string } };
    expect(data.user.name).toBe('New Name');
    expect(data.user.city).toBe('Harare');
    expect(data.user.id).toBe('usr-001');
  });

  it('inserts new user when no D1 record exists and returns 200', async () => {
    mockGetAuth.mockResolvedValue({
      user: { userId: 'stytch-new-456', email: 'new@example.com' },
      failureReason: null,
      detail: null,
    });

    const insertedDbUser = {
      _id: 'generated-id',
      email: 'new@example.com',
      name: 'New User',
      image: null,
      address_locality: 'Cape Town',
      address_country: 'South Africa',
      interests: '["Music"]',
      stytch_user_id: 'stytch-new-456',
      role: null,
      onboarding_completed: 0,
    };

    // Mock D1: first call = SELECT (null), second = INSERT, third = SELECT inserted
    const selectExistingStmt = createMockD1Statement({
      first: vi.fn().mockResolvedValue(null),
    });
    const insertStmt = createMockD1Statement();
    const selectInsertedStmt = createMockD1Statement({
      first: vi.fn().mockResolvedValue(insertedDbUser),
    });

    const db = createMockD1();
    (db.prepare as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(selectExistingStmt)
      .mockReturnValueOnce(insertStmt)
      .mockReturnValueOnce(selectInsertedStmt);

    env = createMockEnv({ DB: db });

    const request = createAuthenticatedRequest(
      'http://localhost:8787/api/auth/profile',
      'valid-token',
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New User',
          city: 'Cape Town',
          country: 'South Africa',
          interests: ['Music'],
        }),
      }
    );

    const response = await worker.fetch(request, env, {} as ExecutionContext);
    expect(response.status).toBe(200);

    const data = await response.json() as { user: { name: string; city: string; country: string; onboardingCompleted: boolean; interests: string[] } };
    expect(data.user.name).toBe('New User');
    expect(data.user.city).toBe('Cape Town');
    expect(data.user.country).toBe('South Africa');
    expect(data.user.interests).toEqual(['Music']);
    expect(data.user.onboardingCompleted).toBe(false);
  });
});
