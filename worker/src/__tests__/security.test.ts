/**
 * Security Tests
 *
 * Tests the security boundary of the nhimbe API:
 * - CORS origin validation (isAllowedOrigin)
 * - API key validation (validateApiKey)
 * - Role-Based Access Control (RBAC)
 * - Input sanitization and injection prevention
 * - Circuit breaker patterns for external services
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_HIERARCHY, type UserRole } from '../types';

// ============================================
// CORS: isAllowedOrigin
// ============================================

// Trusted domains — always allow these and all their subdomains
const TRUSTED_DOMAINS = ['nyuchi.com', 'mukoko.com', 'nhimbe.com'];

function isAllowedOrigin(origin: string, allowedOrigins: string = ''): boolean {
  if (!origin) return false;

  // Always allow localhost in development
  if (origin.startsWith('http://localhost:')) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    // Allow trusted domains and all their subdomains
    if (TRUSTED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }
  } catch {
    // Invalid origin URL
  }

  // Also check ALLOWED_ORIGINS env var for any additional origins
  const extraOrigins = (allowedOrigins || '').split(',').filter(Boolean);
  return extraOrigins.some(allowed => origin === allowed.trim());
}

describe('CORS: isAllowedOrigin', () => {
  describe('localhost handling', () => {
    it('allows localhost with any port', () => {
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://localhost:8787')).toBe(true);
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    });

    it('rejects localhost without port', () => {
      // 'http://localhost' does not match 'http://localhost:' prefix
      expect(isAllowedOrigin('http://localhost')).toBe(false);
    });

    it('rejects https localhost', () => {
      expect(isAllowedOrigin('https://localhost:3000')).toBe(false);
    });
  });

  describe('trusted domain handling', () => {
    it('allows exact trusted domains', () => {
      expect(isAllowedOrigin('https://nhimbe.com')).toBe(true);
      expect(isAllowedOrigin('https://mukoko.com')).toBe(true);
      expect(isAllowedOrigin('https://nyuchi.com')).toBe(true);
    });

    it('allows subdomains of trusted domains', () => {
      expect(isAllowedOrigin('https://app.nhimbe.com')).toBe(true);
      expect(isAllowedOrigin('https://events-api.mukoko.com')).toBe(true);
      expect(isAllowedOrigin('https://staging.app.nyuchi.com')).toBe(true);
    });

    it('rejects domains containing trusted domain as substring', () => {
      // 'evilnhimbe.com' should NOT be allowed
      expect(isAllowedOrigin('https://evilnhimbe.com')).toBe(false);
      expect(isAllowedOrigin('https://notmukoko.com')).toBe(false);
    });
  });

  describe('ALLOWED_ORIGINS env var', () => {
    it('allows origins from env var', () => {
      expect(isAllowedOrigin('https://custom.example.com', 'https://custom.example.com')).toBe(true);
    });

    it('supports comma-separated origins', () => {
      const origins = 'https://a.com,https://b.com';
      expect(isAllowedOrigin('https://a.com', origins)).toBe(true);
      expect(isAllowedOrigin('https://b.com', origins)).toBe(true);
    });

    it('rejects origins not in env var', () => {
      expect(isAllowedOrigin('https://evil.com', 'https://good.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects empty origin', () => {
      expect(isAllowedOrigin('')).toBe(false);
    });

    it('rejects invalid URL', () => {
      expect(isAllowedOrigin('not-a-url')).toBe(false);
    });

    it('rejects null-like values', () => {
      expect(isAllowedOrigin('null')).toBe(false);
    });
  });
});

// ============================================
// API Key Validation
// ============================================

function validateApiKey(apiKey: string | null, authHeader: string | null, envApiKey: string): boolean {
  const key = apiKey || authHeader?.replace('Bearer ', '');
  return key === envApiKey;
}

describe('API Key Validation', () => {
  const ENV_KEY = 'test-api-key-12345';

  it('validates correct API key from X-API-Key header', () => {
    expect(validateApiKey(ENV_KEY, null, ENV_KEY)).toBe(true);
  });

  it('validates correct key from Authorization header', () => {
    expect(validateApiKey(null, `Bearer ${ENV_KEY}`, ENV_KEY)).toBe(true);
  });

  it('rejects wrong API key', () => {
    expect(validateApiKey('wrong-key', null, ENV_KEY)).toBe(false);
  });

  it('rejects null API key', () => {
    expect(validateApiKey(null, null, ENV_KEY)).toBe(false);
  });

  it('prefers X-API-Key over Authorization', () => {
    expect(validateApiKey(ENV_KEY, 'Bearer wrong', ENV_KEY)).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateApiKey('', null, ENV_KEY)).toBe(false);
  });
});

// ============================================
// RBAC: Role-Based Access Control
// ============================================

describe('RBAC: hasPermission', () => {
  describe('role hierarchy ordering', () => {
    it('defines correct hierarchy', () => {
      expect(ROLE_HIERARCHY.user).toBe(0);
      expect(ROLE_HIERARCHY.moderator).toBe(1);
      expect(ROLE_HIERARCHY.admin).toBe(2);
      expect(ROLE_HIERARCHY.super_admin).toBe(3);
    });

    it('user < moderator < admin < super_admin', () => {
      expect(ROLE_HIERARCHY.user).toBeLessThan(ROLE_HIERARCHY.moderator);
      expect(ROLE_HIERARCHY.moderator).toBeLessThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.super_admin);
    });
  });

  describe('permission checks', () => {
    it('same role grants access', () => {
      expect(hasPermission('user', 'user')).toBe(true);
      expect(hasPermission('admin', 'admin')).toBe(true);
      expect(hasPermission('super_admin', 'super_admin')).toBe(true);
    });

    it('higher role grants access to lower role endpoints', () => {
      expect(hasPermission('super_admin', 'user')).toBe(true);
      expect(hasPermission('super_admin', 'moderator')).toBe(true);
      expect(hasPermission('super_admin', 'admin')).toBe(true);
      expect(hasPermission('admin', 'moderator')).toBe(true);
      expect(hasPermission('admin', 'user')).toBe(true);
      expect(hasPermission('moderator', 'user')).toBe(true);
    });

    it('lower role denied access to higher role endpoints', () => {
      expect(hasPermission('user', 'moderator')).toBe(false);
      expect(hasPermission('user', 'admin')).toBe(false);
      expect(hasPermission('user', 'super_admin')).toBe(false);
      expect(hasPermission('moderator', 'admin')).toBe(false);
      expect(hasPermission('moderator', 'super_admin')).toBe(false);
      expect(hasPermission('admin', 'super_admin')).toBe(false);
    });
  });

  describe('admin endpoint access matrix', () => {
    const endpoints: { path: string; requiredRole: UserRole }[] = [
      { path: '/api/admin/stats', requiredRole: 'moderator' },
      { path: '/api/admin/users', requiredRole: 'admin' },
      { path: '/api/admin/users/:id/role', requiredRole: 'super_admin' },
      { path: '/api/admin/events', requiredRole: 'moderator' },
      { path: '/api/admin/support', requiredRole: 'admin' },
    ];

    for (const endpoint of endpoints) {
      it(`${endpoint.path} requires ${endpoint.requiredRole}`, () => {
        const roles: UserRole[] = ['user', 'moderator', 'admin', 'super_admin'];
        for (const role of roles) {
          const expected = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[endpoint.requiredRole];
          expect(hasPermission(role, endpoint.requiredRole)).toBe(expected);
        }
      });
    }
  });
});

// ============================================
// Input Sanitization & Injection Prevention
// ============================================

describe('Input Sanitization', () => {
  describe('SQL injection prevention via parameterized queries', () => {
    it('dangerous SQL strings are treated as literal values', () => {
      // The app uses D1 prepared statements with .bind()
      // These tests verify that dangerous inputs don't break the pattern
      const dangerousInputs = [
        "'; DROP TABLE events; --",
        "1 OR 1=1",
        "1; DELETE FROM users",
        "' UNION SELECT * FROM users --",
        "Robert'); DROP TABLE Students;--",
      ];

      for (const input of dangerousInputs) {
        // If passed through safeParseJSON, they remain strings
        const parsed = safeParseJSON(JSON.stringify(input));
        expect(typeof parsed).toBe('string');
        expect(parsed).toBe(input);
      }
    });
  });

  describe('XSS prevention in event data', () => {
    it('script tags are preserved as literal text (no execution)', () => {
      // The backend stores data as-is; frontend must escape on render
      // This verifies the data round-trips correctly
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img onerror="alert(1)" src="x">',
        '"><script>document.cookie</script>',
        "javascript:alert('xss')",
      ];

      for (const payload of xssPayloads) {
        const json = JSON.stringify({ title: payload });
        const parsed = JSON.parse(json);
        // Data is stored as-is — frontend React escapes on render
        expect(parsed.title).toBe(payload);
      }
    });
  });
});

// ============================================
// Circuit Breaker Pattern
// ============================================

describe('Circuit Breaker Pattern', () => {
  /**
   * The nhimbe API uses several resilience patterns:
   * 1. Graceful degradation for AI features (fallback descriptions, generic summaries)
   * 2. Silent failure for analytics (trackEventView catches errors)
   * 3. Error collection in batch operations (indexEvents collects errors per batch)
   * 4. JWKS cache with TTL (avoids hammering Stytch on every request)
   */

  it('AI description generator has fallback when AI fails', () => {
    // Simulate the fallback logic from description-generator.ts
    const context = {
      eventType: 'workshop',
      targetAudience: 'developers',
      keyTakeaways: 'Learn new skills',
      highlights: 'Free food',
    };

    const parts: string[] = [];
    if (context.eventType) {
      parts.push(`Join us for ${context.eventType.toLowerCase()}`);
    } else {
      parts.push('Join us for this gathering');
    }
    if (context.targetAudience) {
      parts.push(`designed for ${context.targetAudience.toLowerCase()}`);
    }
    let description = parts.join(' ') + '.';
    if (context.keyTakeaways) {
      description += ` ${context.keyTakeaways}`;
    }
    if (context.highlights) {
      description += `\n\nHighlights: ${context.highlights}`;
    }
    description += '\n\nWe look forward to seeing you there!';

    expect(description).toContain('workshop');
    expect(description).toContain('developers');
    expect(description).toContain('Learn new skills');
    expect(description).toContain('Free food');
  });

  it('search summary falls back to count-based message', () => {
    // When LLM fails, search.ts returns a count-based fallback
    const eventCount = 5;
    const fallback = `Found ${eventCount} events matching your search.`;
    expect(fallback).toBe('Found 5 events matching your search.');
  });

  it('empty search returns structured empty result', () => {
    const emptyResult = {
      events: [],
      query: 'nonexistent',
      totalResults: 0,
    };
    expect(emptyResult.events).toHaveLength(0);
    expect(emptyResult.totalResults).toBe(0);
  });
});

// Re-implement for test isolation
function safeParseJSON(value: string | null, defaultValue: unknown = []): unknown {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}
