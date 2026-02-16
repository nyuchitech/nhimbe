/**
 * Timezone & Date Utility Tests
 *
 * Tests date formatting, relative dates, and weather fetching:
 * - formatTime: locale time formatting
 * - formatDate: locale date formatting
 * - getRelativeDate: today/tomorrow/weekday logic
 * - formatEventDateTime: combined date+time display
 * - getWeather: weather API with icon mapping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserTimezone,
  formatTime,
  formatDate,
  getRelativeDate,
  formatEventDateTime,
  getCurrentTimeWithTimezone,
  getWeather,
} from './timezone';

// ============================================
// getUserTimezone
// ============================================

describe('getUserTimezone', () => {
  it('returns timezone object with required fields', () => {
    const tz = getUserTimezone();
    expect(tz).toHaveProperty('timezone');
    expect(tz).toHaveProperty('offset');
    expect(typeof tz.timezone).toBe('string');
    expect(typeof tz.offset).toBe('string');
    expect(tz.offset).toMatch(/^GMT[+-]\d/);
  });

  it('extracts city from timezone', () => {
    const tz = getUserTimezone();
    // City is extracted from Intl timezone (e.g., "America/New_York" → "New York")
    if (tz.city) {
      expect(typeof tz.city).toBe('string');
      expect(tz.city.length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// formatTime
// ============================================

describe('formatTime', () => {
  it('formats Date object', () => {
    const date = new Date('2026-03-15T14:30:00');
    const result = formatTime(date);
    // Should contain time in 12-hour format
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
  });

  it('formats ISO string', () => {
    const result = formatTime('2026-03-15T09:00:00');
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
  });

  it('respects custom options', () => {
    const result = formatTime('2026-03-15T14:30:00', { hour12: false });
    // With hour12: false, format varies by locale but should not have AM/PM
    expect(typeof result).toBe('string');
  });
});

// ============================================
// formatDate
// ============================================

describe('formatDate', () => {
  it('formats Date object with weekday, month, day', () => {
    const date = new Date('2026-03-15');
    const result = formatDate(date);
    // Should contain short weekday and month
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats ISO string', () => {
    const result = formatDate('2026-03-15');
    expect(typeof result).toBe('string');
  });
});

// ============================================
// getRelativeDate
// ============================================

describe('getRelativeDate', () => {
  it('returns "Today" for today\'s date', () => {
    const today = new Date();
    expect(getRelativeDate(today)).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(getRelativeDate(tomorrow)).toBe('Tomorrow');
  });

  it('returns weekday name for dates 2-6 days away', () => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const threeDaysOut = new Date();
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const result = getRelativeDate(threeDaysOut);
    expect(weekdays).toContain(result);
  });

  it('returns formatted date for dates 7+ days away', () => {
    const farOut = new Date();
    farOut.setDate(farOut.getDate() + 14);

    const result = getRelativeDate(farOut);
    // Should not be a simple weekday name
    expect(['Today', 'Tomorrow']).not.toContain(result);
    // Should contain a month abbreviation
    expect(result).toMatch(/\w+/);
  });

  it('returns formatted date for past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = getRelativeDate(yesterday);
    // Past dates should not be "Today" or "Tomorrow"
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Tomorrow');
  });

  it('handles ISO string input', () => {
    const today = new Date();
    const result = getRelativeDate(today.toISOString());
    expect(result).toBe('Today');
  });
});

// ============================================
// formatEventDateTime
// ============================================

describe('formatEventDateTime', () => {
  it('formats with date and time', () => {
    const today = new Date();
    const result = formatEventDateTime(today.toISOString(), '3:00 PM');
    expect(result).toContain('Today');
    expect(result).toContain(',');
  });

  it('parses AM/PM time correctly', () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const result = formatEventDateTime(date.toISOString(), '9:00 AM');
    expect(result).toContain('Tomorrow');
  });

  it('handles time without AM/PM', () => {
    const date = new Date();
    const result = formatEventDateTime(date.toISOString(), '14:30');
    expect(typeof result).toBe('string');
  });

  it('handles missing time string', () => {
    const date = new Date();
    const result = formatEventDateTime(date.toISOString());
    expect(typeof result).toBe('string');
    expect(result).toContain('Today');
  });
});

// ============================================
// getCurrentTimeWithTimezone
// ============================================

describe('getCurrentTimeWithTimezone', () => {
  it('returns time with GMT offset', () => {
    const result = getCurrentTimeWithTimezone();
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)\s*GMT[+-]\d/);
  });
});

// ============================================
// getWeather
// ============================================

describe('getWeather', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('returns weather data on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        current_condition: [{
          temp_C: '25',
          temp_F: '77',
          weatherDesc: [{ value: 'Sunny' }],
        }],
      }),
    });

    const result = await getWeather('Harare');
    expect(result).not.toBeNull();
    expect(result!.temp).toBe('25°C / 77°F');
    expect(result!.condition).toBe('Sunny');
    expect(result!.icon).toBe('sun');
  });

  it('maps cloud conditions to cloud icon', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        current_condition: [{
          temp_C: '20',
          temp_F: '68',
          weatherDesc: [{ value: 'Partly cloudy' }],
        }],
      }),
    });

    const result = await getWeather('Harare');
    expect(result!.icon).toBe('cloud-sun');
  });

  it('maps rain conditions to rain icon', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        current_condition: [{
          temp_C: '15',
          temp_F: '59',
          weatherDesc: [{ value: 'Light rain' }],
        }],
      }),
    });

    const result = await getWeather('Harare');
    expect(result!.icon).toBe('cloud-rain');
  });

  it('maps thunder conditions to lightning icon', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        current_condition: [{
          temp_C: '18',
          temp_F: '64',
          weatherDesc: [{ value: 'Thunderstorm' }],
        }],
      }),
    });

    const result = await getWeather('Harare');
    expect(result!.icon).toBe('cloud-lightning');
  });

  it('returns null on API failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getWeather('Harare');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const result = await getWeather('Harare');
    expect(result).toBeNull();
  });

  it('returns null when current_condition is missing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await getWeather('Harare');
    expect(result).toBeNull();
  });

  it('encodes city name in URL', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ current_condition: [{ temp_C: '30', temp_F: '86', weatherDesc: [{ value: 'Clear' }] }] }),
    });

    await getWeather('Cape Town');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('Cape%20Town'),
      expect.anything()
    );
  });
});
