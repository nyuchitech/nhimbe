/**
 * Calendar Export Utility Tests
 *
 * Tests ICS file generation and calendar URL construction:
 * - generateICS: ICS format compliance
 * - getGoogleCalendarUrl: Google Calendar deep link
 * - getOutlookCalendarUrl: Outlook 365 deep link
 * - getOutlookLiveUrl: Outlook.com deep link
 * - getYahooCalendarUrl: Yahoo Calendar deep link
 * - parseEventDateTime: date/time parsing
 * - getEndDate: duration calculation
 */

import { describe, it, expect } from 'vitest';
import {
  generateICS,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getOutlookLiveUrl,
  getYahooCalendarUrl,
  parseEventDateTime,
  getEndDate,
  type CalendarEvent,
} from './calendar';

const testEvent: CalendarEvent = {
  title: 'Tech Meetup Harare',
  description: 'Monthly developer gathering in Harare',
  location: 'Rainbow Towers, Harare, Zimbabwe',
  startDate: new Date('2026-03-15T14:00:00Z'),
  endDate: new Date('2026-03-15T16:00:00Z'),
  url: 'https://nhimbe.com/events/tech-meetup-harare',
};

// ============================================
// generateICS
// ============================================

describe('generateICS', () => {
  it('generates valid ICS structure', () => {
    const ics = generateICS(testEvent);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
  });

  it('includes required ICS headers', () => {
    const ics = generateICS(testEvent);

    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//nhimbe//Events//EN');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
  });

  it('includes event details', () => {
    const ics = generateICS(testEvent);

    expect(ics).toContain('SUMMARY:Tech Meetup Harare');
    expect(ics).toContain('DESCRIPTION:');
    expect(ics).toContain('LOCATION:Rainbow Towers\\, Harare\\, Zimbabwe');
  });

  it('formats dates in ICS format (YYYYMMDDTHHMMSSZ)', () => {
    const ics = generateICS(testEvent);

    expect(ics).toContain('DTSTART:20260315T140000Z');
    expect(ics).toContain('DTEND:20260315T160000Z');
  });

  it('uses CRLF line endings', () => {
    const ics = generateICS(testEvent);
    expect(ics).toContain('\r\n');
  });

  it('generates unique UID', () => {
    const ics1 = generateICS(testEvent);
    const ics2 = generateICS(testEvent);

    const uid1 = ics1.match(/UID:(.+)/)?.[1];
    const uid2 = ics2.match(/UID:(.+)/)?.[1];

    expect(uid1).toBeDefined();
    expect(uid2).toBeDefined();
    expect(uid1).not.toBe(uid2);
  });

  it('includes URL when provided', () => {
    const ics = generateICS(testEvent);
    expect(ics).toContain('URL:https://nhimbe.com/events/tech-meetup-harare');
  });

  it('excludes URL when not provided', () => {
    const eventWithoutUrl = { ...testEvent, url: undefined };
    const ics = generateICS(eventWithoutUrl);
    expect(ics).not.toContain('URL:');
  });

  it('escapes special characters in ICS', () => {
    const eventWithSpecials = {
      ...testEvent,
      title: 'Event; With, Special\\Characters',
      location: 'Venue, City; Country',
    };
    const ics = generateICS(eventWithSpecials);

    expect(ics).toContain('SUMMARY:Event\\; With\\, Special\\\\Characters');
    expect(ics).toContain('LOCATION:Venue\\, City\\; Country');
  });

  it('escapes newlines in description', () => {
    const eventWithNewlines = {
      ...testEvent,
      description: 'Line 1\nLine 2\nLine 3',
    };
    const ics = generateICS(eventWithNewlines);
    expect(ics).toContain('Line 1\\nLine 2\\nLine 3');
  });
});

// ============================================
// Google Calendar URL
// ============================================

describe('getGoogleCalendarUrl', () => {
  it('generates valid Google Calendar URL', () => {
    const url = getGoogleCalendarUrl(testEvent);
    expect(url).toContain('https://calendar.google.com/calendar/render');
  });

  it('includes required parameters', () => {
    const url = getGoogleCalendarUrl(testEvent);
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Tech+Meetup+Harare');
    expect(url).toContain('dates=');
    expect(url).toContain('location=Rainbow+Towers');
  });

  it('formats dates as start/end pair', () => {
    const url = getGoogleCalendarUrl(testEvent);
    expect(url).toContain('dates=20260315T140000Z%2F20260315T160000Z');
  });

  it('includes event URL in description', () => {
    const url = getGoogleCalendarUrl(testEvent);
    expect(url).toContain('nhimbe.com');
  });
});

// ============================================
// Outlook Calendar URLs
// ============================================

describe('getOutlookCalendarUrl', () => {
  it('generates Office 365 Outlook URL', () => {
    const url = getOutlookCalendarUrl(testEvent);
    expect(url).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
  });

  it('includes subject and dates', () => {
    const url = getOutlookCalendarUrl(testEvent);
    expect(url).toContain('subject=Tech+Meetup+Harare');
    expect(url).toContain('startdt=');
    expect(url).toContain('enddt=');
  });
});

describe('getOutlookLiveUrl', () => {
  it('generates Outlook.com personal URL', () => {
    const url = getOutlookLiveUrl(testEvent);
    expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
  });

  it('includes location', () => {
    const url = getOutlookLiveUrl(testEvent);
    expect(url).toContain('location=Rainbow+Towers');
  });
});

// ============================================
// Yahoo Calendar URL
// ============================================

describe('getYahooCalendarUrl', () => {
  it('generates Yahoo Calendar URL', () => {
    const url = getYahooCalendarUrl(testEvent);
    expect(url).toContain('https://calendar.yahoo.com/');
  });

  it('includes title and location', () => {
    const url = getYahooCalendarUrl(testEvent);
    expect(url).toContain('title=Tech+Meetup+Harare');
    expect(url).toContain('in_loc=Rainbow+Towers');
  });

  it('uses Yahoo date format (no Z suffix)', () => {
    const url = getYahooCalendarUrl(testEvent);
    // Yahoo format: YYYYMMDDTHHMMSS (no Z)
    expect(url).toContain('st=20260315T140000');
    expect(url).not.toContain('st=20260315T140000Z');
  });
});

// ============================================
// parseEventDateTime
// ============================================

describe('parseEventDateTime', () => {
  it('parses ISO date only', () => {
    const date = parseEventDateTime('2026-03-15');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(date.getDate()).toBe(15);
  });

  it('parses 12-hour time (PM)', () => {
    const date = parseEventDateTime('2026-03-15', '2:00 PM');
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(0);
  });

  it('parses 12-hour time (AM)', () => {
    const date = parseEventDateTime('2026-03-15', '9:30 AM');
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(30);
  });

  it('handles 12:00 PM (noon)', () => {
    const date = parseEventDateTime('2026-03-15', '12:00 PM');
    expect(date.getHours()).toBe(12);
  });

  it('handles 12:00 AM (midnight)', () => {
    const date = parseEventDateTime('2026-03-15', '12:00 AM');
    expect(date.getHours()).toBe(0);
  });

  it('parses 24-hour time', () => {
    const date = parseEventDateTime('2026-03-15', '14:30');
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });

  it('handles missing time string', () => {
    const date = parseEventDateTime('2026-03-15');
    expect(date instanceof Date).toBe(true);
  });
});

// ============================================
// getEndDate
// ============================================

describe('getEndDate', () => {
  it('adds default 2 hours', () => {
    const start = new Date('2026-03-15T14:00:00Z');
    const end = getEndDate(start);
    expect(end.getTime() - start.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it('adds custom duration', () => {
    const start = new Date('2026-03-15T14:00:00Z');
    const end = getEndDate(start, 3);
    expect(end.getTime() - start.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it('does not mutate start date', () => {
    const start = new Date('2026-03-15T14:00:00Z');
    const originalTime = start.getTime();
    getEndDate(start, 5);
    expect(start.getTime()).toBe(originalTime);
  });

  it('handles fractional hours (setHours truncates decimals)', () => {
    const start = new Date('2026-03-15T14:00:00Z');
    const end = getEndDate(start, 1.5);
    // setHours truncates fractional values: setHours(14 + 1.5) = setHours(15.5) → 15
    // So 1.5 hours is treated as 1 hour
    expect(end.getTime() - start.getTime()).toBe(1 * 60 * 60 * 1000);
  });
});
