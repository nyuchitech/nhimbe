-- Migration: Add Reviews, Referrals, and Analytics Tables
-- For nhimbe Open Data Features
-- Run: wrangler d1 execute mukoko-nhimbe-db --file=worker/src/db/migrations/add_reviews_referrals.sql

-- ============================================
-- EVENT REVIEWS / RATINGS
-- Public feedback system for events
-- ============================================

CREATE TABLE IF NOT EXISTS event_reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified_attendee INTEGER DEFAULT 0,  -- 1 if user actually attended
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id)  -- One review per user per event
);

CREATE INDEX IF NOT EXISTS idx_reviews_event ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON event_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON event_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON event_reviews(created_at);

-- Review helpful votes (who marked which reviews as helpful)
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_helpful_review ON review_helpful_votes(review_id);

-- ============================================
-- REFERRAL SYSTEM
-- Track who brings people to events
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,      -- Who shared the link
  referred_user_id TEXT,                -- Who signed up (null until they register)
  event_id TEXT,                        -- Optional: specific event referral
  referral_code TEXT NOT NULL,          -- Unique code for tracking
  source TEXT,                          -- 'link', 'email', 'social'
  status TEXT DEFAULT 'pending',        -- 'pending', 'registered', 'attended'
  created_at TEXT DEFAULT (datetime('now')),
  converted_at TEXT                     -- When the referred user took action
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_event ON referrals(event_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- User referral codes (each user has one unique code)
CREATE TABLE IF NOT EXISTS user_referral_codes (
  user_id TEXT PRIMARY KEY,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,  -- Converted to registrations
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- HOST STATISTICS (Aggregated)
-- Pre-computed stats for performance
-- ============================================

CREATE TABLE IF NOT EXISTS host_stats (
  user_id TEXT PRIMARY KEY,
  events_hosted INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_capacity INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,  -- percentage
  total_reviews INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  badges TEXT DEFAULT '[]',            -- JSON array of badge IDs
  reputation_score INTEGER DEFAULT 0,  -- Computed score
  last_event_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ANALYTICS EVENTS
-- For Cloudflare Analytics Engine backup/detail
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,            -- 'view', 'rsvp', 'share', 'referral_click'
  event_id TEXT,
  user_id TEXT,
  session_id TEXT,
  source TEXT,                         -- 'direct', 'referral', 'search', 'social'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,                    -- 'mobile', 'desktop', 'tablet'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_source ON analytics_events(source);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_utm ON analytics_events(utm_source, utm_medium, utm_campaign);

-- ============================================
-- EVENT STATISTICS (Aggregated Daily)
-- For fast dashboard queries
-- ============================================

CREATE TABLE IF NOT EXISTS event_stats_daily (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  date TEXT NOT NULL,                  -- YYYY-MM-DD
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

-- ============================================
-- COMMUNITY INSIGHTS (Aggregated)
-- City/category level analytics
-- ============================================

CREATE TABLE IF NOT EXISTS community_stats (
  id TEXT PRIMARY KEY,
  city TEXT,
  category TEXT,
  period TEXT NOT NULL,                -- 'daily', 'weekly', 'monthly'
  period_start TEXT NOT NULL,          -- Date
  total_events INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  trending_score REAL DEFAULT 0,       -- Computed trend indicator
  top_venues TEXT DEFAULT '[]',        -- JSON array
  peak_times TEXT DEFAULT '[]',        -- JSON array of {day, hour, count}
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(city, category, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_community_city ON community_stats(city);
CREATE INDEX IF NOT EXISTS idx_community_category ON community_stats(category);
CREATE INDEX IF NOT EXISTS idx_community_period ON community_stats(period, period_start);

-- ============================================
-- TRIGGERS
-- Auto-update timestamps
-- ============================================

-- Note: D1 doesn't support triggers, so we'll handle updates in application code
