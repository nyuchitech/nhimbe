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
import { safeParseInt, validateRequiredFields, safeParseJSON, slugify, getInitials } from '../utils/validation';
import { generateShortCode, generateReferralCode } from '../utils/ids';
import { dbRowToEvent } from '../utils/db';

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
      _id: 'evt-1',
      short_code: 'abc123',
      slug: 'test-event',
      name: 'Test Event',
      description: 'A test',
      start_date: '2026-03-15T14:00:00Z',
      date_display_day: '15',
      date_display_month: 'Mar',
      date_display_full: 'Sat, Mar 15',
      date_display_time: '2:00 PM',
      location_name: 'Venue',
      location_street_address: '123 St',
      location_locality: 'Harare',
      location_country: 'Zimbabwe',
      category: 'Tech',
      keywords: '["a","b"]',
      image: 'img.jpg',
      cover_gradient: 'gradient-1',
      attendee_count: 42,
      friends_count: 5,
      maximum_attendee_capacity: 100,
      event_attendance_mode: 'OfflineEventAttendanceMode',
      event_status: 'EventScheduled',
      is_published: 1,
      meeting_url: null,
      meeting_platform: null,
      organizer_name: 'Host',
      organizer_identifier: 'host',
      organizer_initials: 'H',
      organizer_alternate_name: null,
      organizer_event_count: 3,
      offer_price: null,
      offer_price_currency: null,
      offer_url: null,
      offer_availability: null,
      date_created: '2026-01-01',
      date_modified: '2026-01-02',
    };

    const event = dbRowToEvent(row);

    expect(event.id).toBe('evt-1');
    expect(event.shortCode).toBe('abc123');
    expect(event.slug).toBe('test-event');
    expect(event.name).toBe('Test Event');
    expect(event.startDate).toBe('2026-03-15T14:00:00Z');
    expect(event.date.day).toBe('15');
    expect(event.date.month).toBe('Mar');
    expect(event.location.addressLocality).toBe('Harare');
    expect(event.category).toBe('Tech');
    expect(event.keywords).toEqual(['a', 'b']);
    expect(event.attendeeCount).toBe(42);
    expect(event.maximumAttendeeCapacity).toBe(100);
    expect(event.organizer.name).toBe('Host');
    expect(event.offers).toBeUndefined();
  });

  it('parses keywords from JSON string', () => {
    const row = { keywords: '["music","tech"]' } as Record<string, unknown>;
    const event = dbRowToEvent({ ...createMinimalRow(), ...row });
    expect(event.keywords).toEqual(['music', 'tech']);
  });

  it('handles malformed keywords JSON gracefully', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), keywords: 'not-json' });
    expect(event.keywords).toEqual([]);
  });

  it('handles null keywords', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), keywords: null });
    expect(event.keywords).toEqual([]);
  });

  it('correctly handles isPublished boolean coercion', () => {
    expect(dbRowToEvent({ ...createMinimalRow(), is_published: 1 }).isPublished).toBe(true);
    expect(dbRowToEvent({ ...createMinimalRow(), is_published: 0 }).isPublished).toBe(false);
    expect(dbRowToEvent({ ...createMinimalRow(), is_published: null }).isPublished).toBe(false);
  });

  it('includes offers when offer_price exists', () => {
    const event = dbRowToEvent({
      ...createMinimalRow(),
      offer_price: 25,
      offer_price_currency: 'USD',
      offer_availability: 'InStock',
    });
    expect(event.offers).toMatchObject({ price: 25, priceCurrency: 'USD', availability: 'InStock' });
  });

  it('omits offers when offer_price is null and offer_url is absent', () => {
    const event = dbRowToEvent({ ...createMinimalRow(), offer_price: null, offer_url: null });
    expect(event.offers).toBeUndefined();
  });
});

// Helper to create a minimal valid row
function createMinimalRow(): Record<string, unknown> {
  return {
    _id: 'evt-1', short_code: 'x', slug: 'x', name: 'x', description: 'x',
    start_date: '2026-01-01T00:00:00Z',
    date_display_day: '1', date_display_month: 'Jan', date_display_full: 'x', date_display_time: 'x',
    location_name: 'x', location_street_address: 'x', location_locality: 'x', location_country: 'x',
    category: 'x', keywords: '[]', image: null, cover_gradient: null,
    attendee_count: 0, friends_count: null, maximum_attendee_capacity: null,
    event_attendance_mode: 'OfflineEventAttendanceMode', event_status: 'EventScheduled', is_published: 1,
    meeting_url: null, meeting_platform: null,
    organizer_name: 'x', organizer_identifier: 'x', organizer_initials: 'X', organizer_alternate_name: null, organizer_event_count: 0,
    offer_price: null, offer_price_currency: null, offer_url: null, offer_availability: null,
    date_created: '2026-01-01', date_modified: '2026-01-01',
  };
}
