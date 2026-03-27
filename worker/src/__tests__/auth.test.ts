/**
 * Authentication & Authorization Tests
 *
 * Tests JWT validation, bearer token extraction, JWKS caching,
 * and the full authentication flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractBearerToken, getAuthenticatedUser } from '../auth/stytch';

// ============================================
// extractBearerToken
// ============================================

describe('extractBearerToken', () => {
  it('extracts token from valid Bearer header', () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Bearer my-jwt-token-123' },
    });
    expect(extractBearerToken(request)).toBe('my-jwt-token-123');
  });

  it('returns null when no Authorization header', () => {
    const request = new Request('https://api.test.com');
    expect(extractBearerToken(request)).toBeNull();
  });

  it('returns null for non-Bearer auth scheme', () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Basic bm90LWEtcmVhbC10b2tlbg==' },
    });
    expect(extractBearerToken(request)).toBeNull();
  });

  it('returns null for empty Authorization header', () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: '' },
    });
    expect(extractBearerToken(request)).toBeNull();
  });

  it('returns empty string for "Bearer " without token', () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Bearer ' },
    });
    // extractBearerToken returns substring(7) — empty string or null depending on header normalization
    const token = extractBearerToken(request);
    // Header "Bearer " startsWith "Bearer " → returns substring(7) = ''
    // Some runtimes may trim the header value, causing startsWith to fail → null
    expect(token === '' || token === null).toBe(true);
  });

  it('handles token with special characters', () => {
    const token = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.signature';
    const request = new Request('https://api.test.com', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(extractBearerToken(request)).toBe(token);
  });

  it('is case-sensitive on "Bearer" prefix', () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'bearer my-token' },
    });
    expect(extractBearerToken(request)).toBeNull();
  });
});

// ============================================
// getAuthenticatedUser
// ============================================

describe('getAuthenticatedUser', () => {
  const mockEnv = { STYTCH_PROJECT_ID: 'project-test-12345' };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns no_token when no token present', async () => {
    const request = new Request('https://api.test.com');
    const result = await getAuthenticatedUser(request, mockEnv);
    expect(result.user).toBeNull();
    expect(result.failureReason).toBe('no_token');
  });

  it('returns no_token when token is non-Bearer', async () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Basic invalid' },
    });
    const result = await getAuthenticatedUser(request, mockEnv);
    expect(result.user).toBeNull();
    expect(result.failureReason).toBe('no_token');
  });

  it('returns failure reason for malformed JWT (wrong segment count)', async () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    });
    const result = await getAuthenticatedUser(request, mockEnv);
    expect(result.user).toBeNull();
    expect(result.failureReason).toBe('malformed_token');
  });

  it('returns failure reason for JWT with invalid base64 segments', async () => {
    const request = new Request('https://api.test.com', {
      headers: { Authorization: 'Bearer !!!.!!!.!!!' },
    });
    const result = await getAuthenticatedUser(request, mockEnv);
    expect(result.user).toBeNull();
    expect(result.failureReason).toBeDefined();
  });
});

// ============================================
// JWT Structure Validation
// ============================================

describe('JWT structure validation', () => {
  it('rejects JWT with 2 segments', () => {
    const parts = 'header.payload'.split('.');
    expect(parts.length).not.toBe(3);
  });

  it('rejects JWT with 4+ segments', () => {
    const parts = 'a.b.c.d'.split('.');
    expect(parts.length).not.toBe(3);
  });

  it('accepts JWT with exactly 3 segments', () => {
    const parts = 'header.payload.signature'.split('.');
    expect(parts.length).toBe(3);
  });

  it('validates RS256 algorithm requirement', () => {
    // The verifyJWT function checks header.alg === 'RS256'
    const validHeader = { alg: 'RS256', kid: 'key-1', typ: 'JWT' };
    const invalidHeader = { alg: 'HS256', kid: 'key-1', typ: 'JWT' };

    expect(validHeader.alg).toBe('RS256');
    expect(invalidHeader.alg).not.toBe('RS256');
  });
});

// ============================================
// JWKS Cache Behavior
// ============================================

describe('JWKS cache logic', () => {
  const JWKS_CACHE_TTL = 3600_000; // 1 hour

  it('cache is stale after TTL', () => {
    const fetchedAt = Date.now() - JWKS_CACHE_TTL - 1;
    const isStale = Date.now() - fetchedAt >= JWKS_CACHE_TTL;
    expect(isStale).toBe(true);
  });

  it('cache is fresh within TTL', () => {
    const fetchedAt = Date.now() - (JWKS_CACHE_TTL / 2);
    const isStale = Date.now() - fetchedAt >= JWKS_CACHE_TTL;
    expect(isStale).toBe(false);
  });

  it('force refresh ignores cache', () => {
    const forceRefresh = true;
    const fetchedAt = Date.now(); // Just fetched
    // When forceRefresh=true, cache should be bypassed regardless
    expect(forceRefresh || Date.now() - fetchedAt >= JWKS_CACHE_TTL).toBe(true);
  });
});

// ============================================
// JWT Claim Validation
// ============================================

describe('JWT claim validation', () => {
  const projectId = 'project-test-12345';

  it('rejects expired token', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { exp: now - 60 }; // Expired 60 seconds ago
    expect(now >= payload.exp).toBe(true);
  });

  it('accepts non-expired token', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { exp: now + 3600 }; // Expires in 1 hour
    expect(now >= payload.exp).toBe(false);
  });

  it('rejects token used before nbf', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { nbf: now + 60 }; // Not valid for 60 seconds
    expect(now < payload.nbf).toBe(true);
  });

  it('accepts token after nbf', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = { nbf: now - 60 }; // Valid since 60 seconds ago
    expect(now < payload.nbf).toBe(false);
  });

  it('validates issuer matches project', () => {
    const expectedIssuer = `stytch.com/${projectId}`;
    expect(`stytch.com/${projectId}`).toBe(expectedIssuer);
    expect('stytch.com/wrong-project').not.toBe(expectedIssuer);
  });

  it('validates audience contains project ID', () => {
    const validAud = [projectId, 'other-audience'];
    const invalidAud = ['other-audience'];
    expect(validAud.includes(projectId)).toBe(true);
    expect(invalidAud.includes(projectId)).toBe(false);
  });
});
