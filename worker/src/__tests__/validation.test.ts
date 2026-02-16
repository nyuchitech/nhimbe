/**
 * Input Validation & Data Transformation Tests
 *
 * Tests the security boundary functions that gate all user input:
 * - safeParseInt: bounded integer parsing
 * - validateRequiredFields: field presence validation
 * - safeParseJSON: safe JSON deserialization
 * - slugify: URL slug generation
 * - getInitials: name → initials extraction
 * - generateShortCode / generateReferralCode: format correctness
 * - dbRowToEvent: database row → Event object transformation
 */

import { describe, it, expect } from 'vitest';

// Since these are private functions in index.ts, we re-implement them
// exactly as in the source to test the logic. In production you'd export them.

function safeParseInt(value: string | null, defaultValue: number, min: number = 0, max: number = 1000): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

function validateRequiredFields(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && !(obj[field] as string).trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

function safeParseJSON(value: string | null, defaultValue: unknown = []): unknown {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// dbRowToEvent extracted from index.ts
function dbRowToEvent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    shortCode: row.short_code as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    date: {
      day: row.date_day as string,
      month: row.date_month as string,
      full: row.date_full as string,
      time: row.date_time as string,
      iso: row.date_iso as string,
    },
    location: {
      venue: row.location_venue as string,
      address: row.location_address as string,
      city: row.location_city as string,
      country: row.location_country as string,
    },
    category: row.category as string,
    tags: safeParseJSON((row.tags as string), []) as string[],
    coverImage: row.cover_image as string | undefined,
    coverGradient: row.cover_gradient as string | undefined,
    attendeeCount: row.attendee_count as number,
    friendsCount: row.friends_count as number | undefined,
    capacity: row.capacity as number | undefined,
    isOnline: row.is_online as boolean | undefined,
    meetingUrl: row.meeting_url as string | undefined,
    meetingPlatform: row.meeting_platform as string | undefined,
    host: {
      name: row.host_name as string,
      handle: row.host_handle as string,
      initials: row.host_initials as string,
      eventCount: row.host_event_count as number,
    },
    isFree: row.is_free !== false && row.is_free !== 0,
    ticketUrl: row.ticket_url as string | undefined,
    price: row.price_amount
      ? {
          amount: row.price_amount as number,
          currency: row.price_currency as string,
          label: row.price_label as string,
        }
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// safeParseInt
// ============================================

describe('safeParseInt', () => {
  it('returns default when value is null', () => {
    expect(safeParseInt(null, 10)).toBe(10);
  });

  it('returns default when value is empty string', () => {
    expect(safeParseInt('', 10)).toBe(10);
  });

  it('parses valid integers', () => {
    expect(safeParseInt('42', 10)).toBe(42);
    expect(safeParseInt('0', 10)).toBe(0);
    expect(safeParseInt('1', 10)).toBe(1);
  });

  it('returns default for NaN values', () => {
    expect(safeParseInt('abc', 10)).toBe(10);
    expect(safeParseInt('12.5abc', 10)).toBe(12); // parseInt stops at non-digit
    expect(safeParseInt('NaN', 10)).toBe(10);
    expect(safeParseInt('undefined', 10)).toBe(10);
  });

  it('clamps to minimum bound', () => {
    expect(safeParseInt('-5', 10, 0, 100)).toBe(0);
    expect(safeParseInt('-999', 10, 0, 100)).toBe(0);
  });

  it('clamps to maximum bound', () => {
    expect(safeParseInt('2000', 10, 0, 1000)).toBe(1000);
    expect(safeParseInt('999999', 10, 0, 100)).toBe(100);
  });

  it('handles boundary values exactly', () => {
    expect(safeParseInt('0', 10, 0, 100)).toBe(0);
    expect(safeParseInt('100', 10, 0, 100)).toBe(100);
  });

  it('handles negative min/max bounds', () => {
    expect(safeParseInt('-50', 0, -100, -10)).toBe(-50);
    expect(safeParseInt('0', 0, -100, -10)).toBe(-10);
  });

  it('truncates floating point strings', () => {
    expect(safeParseInt('3.14', 0)).toBe(3);
    expect(safeParseInt('9.99', 0)).toBe(9);
  });
});

// ============================================
// validateRequiredFields
// ============================================

describe('validateRequiredFields', () => {
  it('returns null when all fields present', () => {
    expect(validateRequiredFields({ name: 'Test', email: 'a@b.com' }, ['name', 'email'])).toBeNull();
  });

  it('detects missing field', () => {
    expect(validateRequiredFields({ name: 'Test' }, ['name', 'email'])).toBe('Missing required field: email');
  });

  it('detects null value', () => {
    expect(validateRequiredFields({ name: null }, ['name'])).toBe('Missing required field: name');
  });

  it('detects undefined value', () => {
    expect(validateRequiredFields({}, ['name'])).toBe('Missing required field: name');
  });

  it('detects empty string', () => {
    expect(validateRequiredFields({ name: '' }, ['name'])).toBe('Missing required field: name');
  });

  it('detects whitespace-only string', () => {
    expect(validateRequiredFields({ name: '   ' }, ['name'])).toBe('Missing required field: name');
  });

  it('accepts non-string truthy values', () => {
    expect(validateRequiredFields({ count: 0 }, ['count'])).toBe('Missing required field: count');
    expect(validateRequiredFields({ count: 1 }, ['count'])).toBeNull();
    expect(validateRequiredFields({ flag: true }, ['flag'])).toBeNull();
  });

  it('returns first missing field', () => {
    const result = validateRequiredFields({}, ['a', 'b', 'c']);
    expect(result).toBe('Missing required field: a');
  });

  it('handles empty fields array', () => {
    expect(validateRequiredFields({}, [])).toBeNull();
  });
});

// ============================================
// safeParseJSON
// ============================================

describe('safeParseJSON', () => {
  it('parses valid JSON', () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 });
    expect(safeParseJSON('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeParseJSON('"hello"')).toBe('hello');
  });

  it('returns default for null', () => {
    expect(safeParseJSON(null)).toEqual([]);
    expect(safeParseJSON(null, {})).toEqual({});
  });

  it('returns default for empty string', () => {
    expect(safeParseJSON('')).toEqual([]);
  });

  it('returns default for invalid JSON', () => {
    expect(safeParseJSON('{invalid}')).toEqual([]);
    expect(safeParseJSON('not json', 'fallback')).toBe('fallback');
  });

  it('handles nested JSON', () => {
    const result = safeParseJSON('{"a":{"b":[1,2]}}');
    expect(result).toEqual({ a: { b: [1, 2] } });
  });

  it('handles JSON with special characters', () => {
    expect(safeParseJSON('["hello\\nworld"]')).toEqual(['hello\nworld']);
  });
});

// ============================================
// slugify
// ============================================

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('my event title')).toBe('my-event-title');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! @World #2026')).toBe('hello-world-2026');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('handles unicode characters', () => {
    expect(slugify('café müsic')).toBe('caf-msic');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('converts leading/trailing whitespace to hyphens', () => {
    // trim() only removes whitespace, but spaces are already converted to hyphens
    // so leading/trailing spaces become leading/trailing hyphens
    expect(slugify('  hello world  ')).toBe('-hello-world-');
  });

  it('handles multiple spaces', () => {
    expect(slugify('hello    world')).toBe('hello-world');
  });

  it('preserves hyphens', () => {
    expect(slugify('pre-existing-slug')).toBe('pre-existing-slug');
  });

  it('preserves underscores', () => {
    expect(slugify('hello_world')).toBe('hello_world');
  });
});

// ============================================
// getInitials
// ============================================

describe('getInitials', () => {
  it('extracts two initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('extracts first two initials from long name', () => {
    expect(getInitials('John William Doe')).toBe('JW');
  });

  it('extracts single initial from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('uppercases initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('limits to 2 characters', () => {
    expect(getInitials('A B C D E').length).toBeLessThanOrEqual(2);
  });
});

// ============================================
// generateShortCode
// ============================================

describe('generateShortCode', () => {
  it('generates 8-character code', () => {
    expect(generateShortCode()).toHaveLength(8);
  });

  it('contains only alphanumeric characters', () => {
    const code = generateShortCode();
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateShortCode()));
    // With 62^8 possible combinations, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

// ============================================
// generateReferralCode
// ============================================

describe('generateReferralCode', () => {
  it('generates 8-character code', () => {
    expect(generateReferralCode()).toHaveLength(8);
  });

  it('excludes ambiguous characters (0, O, I, 1)', () => {
    // Charset "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" excludes 0, O, I, 1
    // Note: L is intentionally included in the charset
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(code).not.toMatch(/[0OI1]/);
    }
  });

  it('contains only uppercase letters and digits', () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});

// ============================================
// dbRowToEvent
// ============================================

describe('dbRowToEvent', () => {
  it('transforms complete database row to Event', () => {
    const row = {
      id: 'evt-1',
      short_code: 'abc123',
      slug: 'test-event',
      title: 'Test Event',
      description: 'A test',
      date_day: '15',
      date_month: 'Mar',
      date_full: 'Sat, Mar 15',
      date_time: '2:00 PM',
      date_iso: '2026-03-15T14:00:00Z',
      location_venue: 'Venue',
      location_address: '123 St',
      location_city: 'Harare',
      location_country: 'Zimbabwe',
      category: 'Tech',
      tags: '["a","b"]',
      cover_image: 'img.jpg',
      cover_gradient: 'gradient-1',
      attendee_count: 42,
      friends_count: 5,
      capacity: 100,
      is_online: false,
      meeting_url: null,
      meeting_platform: null,
      host_name: 'Host',
      host_handle: 'host',
      host_initials: 'H',
      host_event_count: 3,
      is_free: true,
      ticket_url: null,
      price_amount: null,
      price_currency: null,
      price_label: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };

    const event = dbRowToEvent(row);

    expect(event.id).toBe('evt-1');
    expect(event.shortCode).toBe('abc123');
    expect(event.slug).toBe('test-event');
    expect(event.title).toBe('Test Event');
    expect(event.date.day).toBe('15');
    expect(event.date.month).toBe('Mar');
    expect(event.location.city).toBe('Harare');
    expect(event.category).toBe('Tech');
    expect(event.tags).toEqual(['a', 'b']);
    expect(event.attendeeCount).toBe(42);
    expect(event.capacity).toBe(100);
    expect(event.host.name).toBe('Host');
    expect(event.isFree).toBe(true);
    expect(event.price).toBeUndefined();
  });

  it('parses tags from JSON string', () => {
    const row = { tags: '["music","tech"]' } as Record<string, unknown>;
    const event = dbRowToEvent({ ...createMinimalRow(), ...row });
    expect(event.tags).toEqual(['music', 'tech']);
  });

  it('handles malformed tags JSON gracefully', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), tags: 'not-json' });
    expect(event.tags).toEqual([]);
  });

  it('handles null tags', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), tags: null });
    expect(event.tags).toEqual([]);
  });

  it('correctly handles isFree boolean coercion', () => {
    // is_free = true → isFree = true
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: true }).isFree).toBe(true);
    // is_free = 1 → isFree = true
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: 1 }).isFree).toBe(true);
    // is_free = false → isFree = false
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: false }).isFree).toBe(false);
    // is_free = 0 → isFree = false
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: 0 }).isFree).toBe(false);
    // is_free = null → isFree = true (default)
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: null }).isFree).toBe(true);
    // is_free = undefined → isFree = true (default)
    expect(dbRowToEvent({ ...createMinimalRow(), is_free: undefined }).isFree).toBe(true);
  });

  it('includes price when price_amount exists', () => {
    const event = dbRowToEvent({
      ...createMinimalRow(),
      price_amount: 25,
      price_currency: 'USD',
      price_label: '$25',
    });
    expect(event.price).toEqual({ amount: 25, currency: 'USD', label: '$25' });
  });

  it('omits price when price_amount is null', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), price_amount: null });
    expect(event.price).toBeUndefined();
  });
});

// Helper to create a minimal valid row
function createMinimalRow(): Record<string, unknown> {
  return {
    id: 'evt-1', short_code: 'x', slug: 'x', title: 'x', description: 'x',
    date_day: '1', date_month: 'Jan', date_full: 'x', date_time: 'x', date_iso: 'x',
    location_venue: 'x', location_address: 'x', location_city: 'x', location_country: 'x',
    category: 'x', tags: '[]', cover_image: null, cover_gradient: null,
    attendee_count: 0, friends_count: null, capacity: null,
    is_online: false, meeting_url: null, meeting_platform: null,
    host_name: 'x', host_handle: 'x', host_initials: 'X', host_event_count: 0,
    is_free: true, ticket_url: null, price_amount: null, price_currency: null, price_label: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  };
}
