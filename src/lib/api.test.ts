/**
 * API Client Tests
 *
 * Tests the centralized API client (src/lib/api.ts):
 * - apiFetch wrapper: error handling, JSON parsing, status codes
 * - Query parameter construction
 * - Each API function's request shape
 * - Error propagation vs. silent null returns
 * - Media URL construction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEvents,
  getEventById,
  getCategories,
  getCities,
  findEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  getUserRegistrations,
  registerForEvent,
  cancelRegistration,
  getUser,
  trackEventView,
  uploadMedia,
  getMediaUrl,
  getEventReviews,
  submitEventReview,
  getEventStats,
  getCommunityStats,
  getTrendingEvents,
  getHostReputation,
  getUserReferralCode,
} from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://events-api.mukoko.com';

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn();
});

function mockFetch(body: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(status = 500) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Internal Server Error',
    json: () => Promise.resolve({ error: 'Server error' }),
  });
}

// ============================================
// getEvents
// ============================================

describe('getEvents', () => {
  it('fetches events without params', async () => {
    mockFetch({ events: [], pagination: { limit: 20, offset: 0, total: 0 } });

    const result = await getEvents();
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events`,
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
    expect(result.events).toEqual([]);
  });

  it('builds query params for city filter', async () => {
    mockFetch({ events: [], pagination: { limit: 20, offset: 0, total: 0 } });

    await getEvents({ city: 'Harare' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('city=Harare'),
      expect.anything()
    );
  });

  it('builds query params for category filter', async () => {
    mockFetch({ events: [], pagination: { limit: 20, offset: 0, total: 0 } });

    await getEvents({ category: 'Tech' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('category=Tech'),
      expect.anything()
    );
  });

  it('builds query params for pagination', async () => {
    mockFetch({ events: [], pagination: { limit: 10, offset: 20, total: 50 } });

    await getEvents({ limit: 10, offset: 20 });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
  });

  it('throws on API error', async () => {
    mockFetchError(500);
    await expect(getEvents()).rejects.toThrow('API Error: 500');
  });
});

// ============================================
// getEventById
// ============================================

describe('getEventById', () => {
  it('returns event data on success', async () => {
    const event = { id: 'evt-1', title: 'Test' };
    mockFetch({ event });

    const result = await getEventById('evt-1');
    expect(result).toEqual({ event });
  });

  it('returns null on error (silent failure)', async () => {
    mockFetchError(404);
    const result = await getEventById('nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================
// findEvent
// ============================================

describe('findEvent', () => {
  it('returns event from getEventById', async () => {
    const event = { id: 'evt-1', title: 'Test' };
    mockFetch({ event });

    const result = await findEvent('evt-1');
    expect(result).toEqual(event);
  });

  it('returns null when event not found', async () => {
    mockFetchError(404);
    const result = await findEvent('nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================
// getCategories / getCities
// ============================================

describe('getCategories', () => {
  it('returns categories array', async () => {
    mockFetch({ categories: [{ id: '1', name: 'Tech', group: 'Technology' }] });
    const result = await getCategories();
    expect(result).toEqual([{ id: '1', name: 'Tech', group: 'Technology' }]);
  });
});

describe('getCities', () => {
  it('returns cities array', async () => {
    mockFetch({ cities: [{ addressLocality: 'Harare', addressCountry: 'Zimbabwe' }] });
    const result = await getCities();
    expect(result).toEqual([{ addressLocality: 'Harare', addressCountry: 'Zimbabwe' }]);
  });
});

// ============================================
// CRUD Operations
// ============================================

describe('createEvent', () => {
  it('sends POST with event data', async () => {
    mockFetch({ event: { id: 'new-1' }, message: 'Created' });

    const input = {
      name: 'New Event',
      description: 'Test',
      startDate: '2026-01-01T10:00:00Z',
      date: { day: '1', month: 'Jan', full: 'Jan 1', time: '10:00' },
      location: { name: 'V', streetAddress: 'A', addressLocality: 'Harare', addressCountry: 'Zimbabwe' },
      category: 'Tech',
      keywords: ['test'],
      organizer: { name: 'Host', identifier: 'h', initials: 'H', eventCount: 0 },
    };

    await createEvent(input);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('updateEvent', () => {
  it('sends PUT with partial update', async () => {
    mockFetch({ message: 'Updated' });

    await updateEvent('evt-1', { name: 'Updated Title' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events/evt-1`,
      expect.objectContaining({ method: 'PUT' })
    );
  });
});

describe('deleteEvent', () => {
  it('sends DELETE request', async () => {
    mockFetch({ message: 'Deleted' });

    await deleteEvent('evt-1');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events/evt-1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ============================================
// Registrations
// ============================================

describe('Registrations', () => {
  it('getEventRegistrations fetches by eventId', async () => {
    mockFetch({ registrations: [] });
    await getEventRegistrations('evt-1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-1'),
      expect.anything()
    );
  });

  it('getUserRegistrations fetches by userId', async () => {
    mockFetch({ registrations: [] });
    await getUserRegistrations('usr-1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('userId=usr-1'),
      expect.anything()
    );
  });

  it('registerForEvent sends POST', async () => {
    mockFetch({ id: 'reg-1', message: 'Registered' });
    await registerForEvent({ eventId: 'evt-1', userId: 'usr-1' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/registrations`,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('cancelRegistration sends DELETE', async () => {
    mockFetch({ message: 'Cancelled' });
    await cancelRegistration('reg-1');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/registrations/reg-1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

// ============================================
// Users
// ============================================

describe('getUser', () => {
  it('returns user on success', async () => {
    const user = { id: 'usr-1', name: 'Test' };
    mockFetch({ user });
    const result = await getUser('usr-1');
    expect(result).toEqual(user);
  });

  it('returns null on error (silent failure)', async () => {
    mockFetchError(404);
    const result = await getUser('nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================
// Analytics
// ============================================

describe('trackEventView', () => {
  it('silently swallows errors', async () => {
    mockFetchError(500);
    // Should not throw
    await expect(trackEventView('evt-1')).resolves.toBeUndefined();
  });

  it('sends POST with event ID', async () => {
    mockFetch({});
    await trackEventView('evt-1', 'usr-1');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events/evt-1/view`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ============================================
// Media
// ============================================

describe('getMediaUrl', () => {
  it('returns base URL without options', () => {
    const url = getMediaUrl('my-image.jpg');
    expect(url).toBe(`${API_URL}/api/media/my-image.jpg`);
  });

  it('adds width parameter', () => {
    const url = getMediaUrl('img.jpg', { width: 800 });
    expect(url).toContain('w=800');
  });

  it('adds height parameter', () => {
    const url = getMediaUrl('img.jpg', { height: 600 });
    expect(url).toContain('h=600');
  });

  it('adds format parameter', () => {
    const url = getMediaUrl('img.jpg', { format: 'webp' });
    expect(url).toContain('format=webp');
  });

  it('combines all options', () => {
    const url = getMediaUrl('img.jpg', { width: 800, height: 600, format: 'avif' });
    expect(url).toContain('w=800');
    expect(url).toContain('h=600');
    expect(url).toContain('format=avif');
  });

  it('omits query string when options are empty', () => {
    const url = getMediaUrl('img.jpg', {});
    expect(url).toBe(`${API_URL}/api/media/img.jpg`);
  });
});

// ============================================
// Reviews
// ============================================

describe('Reviews', () => {
  it('getEventReviews fetches by event ID', async () => {
    mockFetch({ reviews: [], stats: { averageRating: 0, totalReviews: 0, distribution: {} } });
    await getEventReviews('evt-1');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events/evt-1/reviews`,
      expect.anything()
    );
  });

  it('submitEventReview sends POST', async () => {
    mockFetch({ id: 'rev-1', message: 'Submitted' });
    await submitEventReview('evt-1', { userId: 'usr-1', rating: 5, comment: 'Great!' });
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/events/evt-1/reviews`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ============================================
// Stats & Community
// ============================================

describe('Stats', () => {
  it('getEventStats fetches stats', async () => {
    mockFetch({ stats: { views: 100 } });
    const result = await getEventStats('evt-1');
    expect(result).toEqual({ views: 100 });
  });

  it('getCommunityStats fetches without city', async () => {
    mockFetch({ stats: { totalEvents: 50 } });
    await getCommunityStats();
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/api/community/stats`,
      expect.anything()
    );
  });

  it('getCommunityStats encodes city parameter', async () => {
    mockFetch({ stats: { totalEvents: 10 } });
    await getCommunityStats('Cape Town');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('city=Cape%20Town'),
      expect.anything()
    );
  });

  it('getTrendingEvents builds query params', async () => {
    mockFetch({ events: [] });
    await getTrendingEvents({ city: 'Harare', limit: 5 });
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('city=Harare');
    expect(url).toContain('limit=5');
  });
});

// ============================================
// Host Reputation & Referrals
// ============================================

describe('Host Reputation', () => {
  it('returns host stats on success', async () => {
    mockFetch({ host: { userId: 'usr-1', rating: 4.5 } });
    const result = await getHostReputation('usr-1');
    expect(result).toEqual({ userId: 'usr-1', rating: 4.5 });
  });

  it('returns null on error', async () => {
    mockFetchError(404);
    const result = await getHostReputation('nonexistent');
    expect(result).toBeNull();
  });
});

describe('Referral Code', () => {
  it('returns referral code on success', async () => {
    mockFetch({ code: 'ABC12345', totalReferrals: 10, totalConversions: 5 });
    const result = await getUserReferralCode('usr-1');
    expect(result).toEqual({ code: 'ABC12345', totalReferrals: 10, totalConversions: 5 });
  });

  it('returns null on error', async () => {
    mockFetchError(404);
    const result = await getUserReferralCode('nonexistent');
    expect(result).toBeNull();
  });
});
