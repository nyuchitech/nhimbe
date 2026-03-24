-- Migration: Reviews, Referrals, and Analytics Tables
-- event_reviews, referrals, user_referral_codes are in schema.sql for new installs.
-- This migration adds auxiliary analytics tables not in base schema.

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES event_reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  date_created TEXT DEFAULT (datetime('now')),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_helpful_review ON review_helpful_votes(review_id);

-- Host statistics (aggregated, pre-computed for performance)
CREATE TABLE IF NOT EXISTS host_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(_id) ON DELETE CASCADE,
  events_hosted INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_capacity INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  badges TEXT DEFAULT '[]',         -- JSON array of badge IDs
  reputation_score INTEGER DEFAULT 0,
  last_event_at TEXT,
  date_modified TEXT DEFAULT (datetime('now'))
);

-- Analytics events (detailed event tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,         -- view, rsvp, share, referral_click
  event_id TEXT REFERENCES events(_id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  session_id TEXT,
  source TEXT,                      -- direct, referral, search, social
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,                 -- mobile, desktop, tablet
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(date_created);

-- Daily event stats (aggregated for fast dashboard queries)
CREATE TABLE IF NOT EXISTS event_stats_daily (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  date TEXT NOT NULL,               -- YYYY-MM-DD
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  rsvps INTEGER DEFAULT 0,
  cancellations INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  referral_clicks INTEGER DEFAULT 0,
  referral_conversions INTEGER DEFAULT 0,
  UNIQUE(event_id, date)
);

CREATE INDEX IF NOT EXISTS idx_event_stats_event ON event_stats_daily(event_id);
CREATE INDEX IF NOT EXISTS idx_event_stats_date ON event_stats_daily(date);

-- Community insights (city/category level analytics)
CREATE TABLE IF NOT EXISTS community_stats (
  id TEXT PRIMARY KEY,
  city TEXT,
  category TEXT,
  period TEXT NOT NULL,             -- daily, weekly, monthly
  period_start TEXT NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  trending_score REAL DEFAULT 0,
  top_venues TEXT DEFAULT '[]',     -- JSON array
  peak_times TEXT DEFAULT '[]',     -- JSON array of {day, hour, count}
  date_modified TEXT DEFAULT (datetime('now')),
  UNIQUE(city, category, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_community_city ON community_stats(city);
CREATE INDEX IF NOT EXISTS idx_community_category ON community_stats(category);
CREATE INDEX IF NOT EXISTS idx_community_period ON community_stats(period, period_start);
