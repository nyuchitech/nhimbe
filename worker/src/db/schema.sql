-- nhimbe D1 Database Schema v1.0 (schema.org-aligned)
-- Canonical schema — all migrations merged into a single source of truth.
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/schema.sql
--
-- Naming conventions:
--   Tables: snake_case plural (events, users, registrations)
--   Columns: snake_case mapping to schema.org camelCase in API responses
--   Timestamps: date_created / date_modified (schema.org dateCreated / dateModified)
--   Foreign keys: <entity>_id (event_id, user_id)
--   Primary keys: _id (legacy) or id depending on table

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Mineral themes
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gradient TEXT NOT NULL,
  colors TEXT NOT NULL, -- JSON array of 3 colors for Three.js
  date_created TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO themes (id, name, gradient, colors) VALUES
  ('malachite', 'Malachite', 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)', '["#004D40", "#00796B", "#64FFDA"]'),
  ('tanzanite', 'Tanzanite', 'linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)', '["#1A0A2E", "#4B0082", "#B388FF"]'),
  ('gold', 'Gold', 'linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)', '["#5D4037", "#8B5A00", "#FFD740"]'),
  ('tigers-eye', 'Tiger''s Eye', 'linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)', '["#4A2C00", "#8B4513", "#D4A574"]'),
  ('obsidian', 'Obsidian', 'linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)', '["#0A0A0A", "#1E1E1E", "#3A3A3A"]');

-- Categories (schema.org Thing)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  date_created TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Events (schema.org Event)
CREATE TABLE IF NOT EXISTS events (
  _id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- schema.org Event core
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date TEXT NOT NULL,              -- ISO 8601 (schema.org startDate)
  end_date TEXT,                         -- ISO 8601 (schema.org endDate)

  -- Display helpers (pre-formatted for UI)
  date_display_day TEXT NOT NULL,
  date_display_month TEXT NOT NULL,
  date_display_full TEXT NOT NULL,
  date_display_time TEXT NOT NULL,

  -- schema.org Place / PostalAddress (schema.org location)
  location_type TEXT,                    -- schema.org @type (Place, VirtualLocation)
  location_name TEXT NOT NULL,           -- schema.org name
  location_street_address TEXT,          -- schema.org streetAddress
  location_locality TEXT NOT NULL,       -- schema.org addressLocality
  location_country TEXT NOT NULL,        -- schema.org addressCountry
  location_url TEXT,                     -- schema.org url (for virtual)

  -- Categorization
  category TEXT NOT NULL,                -- schema.org about
  keywords TEXT NOT NULL DEFAULT '[]',   -- JSON array (schema.org keywords)

  -- Media
  image TEXT,                            -- schema.org image
  cover_gradient TEXT,
  theme_id TEXT DEFAULT 'malachite',

  -- Attendance
  attendee_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  maximum_attendee_capacity INTEGER,     -- schema.org maximumAttendeeCapacity

  -- schema.org eventAttendanceMode
  event_attendance_mode TEXT DEFAULT 'OfflineEventAttendanceMode',

  -- schema.org eventStatus
  event_status TEXT DEFAULT 'EventScheduled',

  -- Visibility
  is_published BOOLEAN DEFAULT TRUE,

  -- Online meeting (schema.org VirtualLocation)
  meeting_url TEXT,
  meeting_platform TEXT,                 -- zoom, google_meet, teams, other

  -- schema.org Organization (organizer)
  organizer_name TEXT NOT NULL,
  organizer_alternate_name TEXT,         -- schema.org alternateName
  organizer_initials TEXT NOT NULL,
  organizer_identifier TEXT,             -- schema.org identifier (handle/slug)
  organizer_event_count INTEGER DEFAULT 0,

  -- schema.org Offer
  offer_price REAL,                      -- schema.org price
  offer_price_currency TEXT,             -- schema.org priceCurrency
  offer_url TEXT,                        -- schema.org url
  offer_availability TEXT,               -- schema.org availability (InStock, SoldOut, Free)

  -- Series (schema.org isPartOf)
  series_id TEXT REFERENCES event_series(id),
  series_index INTEGER,

  -- Soft delete
  deleted_at TEXT,

  -- schema.org dateCreated / dateModified
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_locality ON events(location_locality);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_short_code ON events(short_code);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(event_status);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_identifier);
CREATE INDEX IF NOT EXISTS idx_events_deleted ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_series ON events(series_id);

-- Users (schema.org Person)
CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,            -- schema.org email
  name TEXT NOT NULL,                    -- schema.org name
  alternate_name TEXT UNIQUE,            -- schema.org alternateName (handle/username)

  -- schema.org Person fields
  image TEXT,                            -- schema.org image
  description TEXT,                      -- schema.org description

  -- schema.org PostalAddress
  address_locality TEXT,                 -- schema.org addressLocality
  address_country TEXT,                  -- schema.org addressCountry

  -- Preferences
  interests TEXT,                        -- JSON array of category IDs

  -- Stats
  events_attended INTEGER DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,

  -- Auth
  stytch_user_id TEXT UNIQUE,
  role TEXT DEFAULT 'user',              -- user, moderator, admin, super_admin
  onboarding_completed BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TEXT,
  email_preferences TEXT DEFAULT '{"marketing":true,"reminders":true,"updates":true}',

  -- Soft delete
  deleted_at TEXT,

  -- schema.org dateCreated / dateModified
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_stytch ON users(stytch_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_alternate_name ON users(alternate_name);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

-- Registrations (schema.org ReserveAction)
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'registered',      -- pending, registered, approved, rejected, cancelled, attended

  -- schema.org Offer / Ticket
  ticket_type TEXT,
  ticket_price REAL,
  ticket_currency TEXT,

  -- Timestamps
  registered_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  checked_in_at TEXT,

  -- Soft delete
  deleted_at TEXT,

  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- ============================================================================
-- SOCIAL TABLES
-- ============================================================================

-- User follows (schema.org FollowAction)
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  date_created TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);

-- Event reviews (schema.org Review)
CREATE TABLE IF NOT EXISTS event_reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),  -- schema.org reviewRating
  review_body TEXT,                      -- schema.org reviewBody
  helpful_count INTEGER DEFAULT 0,
  is_verified_attendee BOOLEAN DEFAULT FALSE,
  date_created TEXT DEFAULT (datetime('now')),              -- schema.org dateCreated
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_event ON event_reviews(event_id);

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES event_reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  date_created TEXT DEFAULT (datetime('now')),
  UNIQUE(review_id, user_id)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  referrer_user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  referred_user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, converted
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_event ON referrals(event_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- User referral codes
CREATE TABLE IF NOT EXISTS user_referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON user_referral_codes(code);

-- ============================================================================
-- EVENT SERIES (schema.org EventSeries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- schema.org name (was: title)
  recurrence_rule TEXT NOT NULL,         -- RRULE string
  host_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  template_event_id TEXT,
  max_occurrences INTEGER DEFAULT 52,
  ends_at TEXT,
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_series_host ON event_series(host_id);

-- ============================================================================
-- WAITLISTS & PAYMENTS
-- ============================================================================

-- Waitlists
CREATE TABLE IF NOT EXISTS waitlists (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',         -- waiting, promoted, expired
  date_created TEXT DEFAULT (datetime('now')),
  promoted_at TEXT,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlists_event ON waitlists(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_user ON waitlists(user_id);

-- Payments (schema.org PayAction)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',  -- schema.org priceCurrency
  provider TEXT NOT NULL,                -- paynow, stripe
  provider_reference TEXT,
  status TEXT DEFAULT 'pending',         -- pending, completed, failed, refunded
  date_created TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  refunded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- HOST REPUTATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS host_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(_id) ON DELETE CASCADE,
  events_hosted INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_capacity INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  badges TEXT DEFAULT '[]',              -- JSON array
  reputation_score INTEGER DEFAULT 0,
  last_event_at TEXT,
  date_modified TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- SUPPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',       -- general, bug, feature, billing, other
  priority TEXT DEFAULT 'medium',        -- low, medium, high
  status TEXT DEFAULT 'open',            -- open, pending, resolved
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,             -- user, admin
  sender_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- Event views
CREATE TABLE IF NOT EXISTS event_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  viewed_at TEXT DEFAULT (datetime('now')),
  source TEXT                            -- web, app, share
);

CREATE INDEX IF NOT EXISTS idx_event_views_event ON event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_viewed_at ON event_views(viewed_at);

-- Analytics events (granular tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,              -- view, rsvp, share, referral_click
  event_id TEXT REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  session_id TEXT,
  source TEXT,                           -- direct, referral, search, social
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  address_country TEXT,                  -- schema.org addressCountry
  address_locality TEXT,                 -- schema.org addressLocality
  device_type TEXT,                      -- mobile, desktop, tablet
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_id ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(date_created);

-- Event stats daily (aggregated)
CREATE TABLE IF NOT EXISTS event_stats_daily (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
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

-- Community stats (aggregated)
CREATE TABLE IF NOT EXISTS community_stats (
  id TEXT PRIMARY KEY,
  address_locality TEXT,                 -- schema.org addressLocality
  category TEXT,
  period TEXT NOT NULL,                  -- daily, weekly, monthly
  period_start TEXT NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  trending_score REAL DEFAULT 0,
  top_venues TEXT DEFAULT '[]',          -- JSON array
  peak_times TEXT DEFAULT '[]',          -- JSON array
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_community_stats_locality ON community_stats(address_locality);
CREATE INDEX IF NOT EXISTS idx_community_stats_period ON community_stats(period, period_start);

-- Search queries
CREATE TABLE IF NOT EXISTS search_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  results_count INTEGER,
  searched_at TEXT DEFAULT (datetime('now'))
);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE CASCADE,
  messages TEXT NOT NULL,                -- JSON array of messages
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT,                          -- JSON
  ip_address TEXT,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(date_created);

-- ============================================================================
-- FULL-TEXT SEARCH
-- ============================================================================

CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  name,
  description,
  location_locality,
  category,
  keywords,
  content='events',
  content_rowid='rowid'
);
