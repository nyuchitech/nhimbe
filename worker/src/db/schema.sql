-- nhimbe D1 Database Schema (schema.org-aligned)
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/schema.sql

-- Mineral themes (reference table)
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gradient TEXT NOT NULL,
  colors TEXT NOT NULL, -- JSON array of 3 colors for Three.js
  date_created TEXT DEFAULT (datetime('now'))
);

-- Insert default mineral themes
INSERT OR IGNORE INTO themes (id, name, gradient, colors) VALUES
  ('malachite', 'Malachite', 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)', '["#004D40", "#00796B", "#64FFDA"]'),
  ('tanzanite', 'Tanzanite', 'linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)', '["#1A0A2E", "#4B0082", "#B388FF"]'),
  ('gold', 'Gold', 'linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)', '["#5D4037", "#8B5A00", "#FFD740"]'),
  ('tigers-eye', 'Tiger''s Eye', 'linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)', '["#4A2C00", "#8B4513", "#D4A574"]'),
  ('obsidian', 'Obsidian', 'linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)', '["#0A0A0A", "#1E1E1E", "#3A3A3A"]');

-- Events table (schema.org Event model)
CREATE TABLE IF NOT EXISTS events (
  _id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- schema.org Event core fields
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date TEXT NOT NULL,   -- ISO 8601
  end_date TEXT,

  -- Display helpers (pre-formatted for UI)
  date_display_day TEXT NOT NULL,
  date_display_month TEXT NOT NULL,
  date_display_full TEXT NOT NULL,
  date_display_time TEXT NOT NULL,

  -- schema.org Place / PostalAddress
  location_type TEXT,
  location_name TEXT NOT NULL,
  location_street_address TEXT,
  location_locality TEXT NOT NULL,
  location_country TEXT NOT NULL,
  location_url TEXT,

  -- Categorization
  category TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]', -- JSON array (schema.org keywords)

  -- Media
  image TEXT,
  cover_gradient TEXT,
  theme_id TEXT DEFAULT 'malachite',

  -- Stats
  attendee_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  maximum_attendee_capacity INTEGER, -- schema.org maximumAttendeeCapacity

  -- schema.org eventAttendanceMode
  event_attendance_mode TEXT DEFAULT 'OfflineEventAttendanceMode',

  -- schema.org eventStatus
  event_status TEXT DEFAULT 'EventScheduled',

  -- Visibility
  is_published BOOLEAN DEFAULT TRUE,

  -- Online meeting (for OnlineEventAttendanceMode)
  meeting_url TEXT,
  meeting_platform TEXT, -- zoom, google_meet, teams, other

  -- schema.org Organization (organizer)
  organizer_name TEXT NOT NULL,
  organizer_alternate_name TEXT,
  organizer_initials TEXT NOT NULL,
  organizer_identifier TEXT,  -- handle/slug
  organizer_event_count INTEGER DEFAULT 0,

  -- schema.org Offer
  offer_price REAL,
  offer_price_currency TEXT,
  offer_url TEXT,
  offer_availability TEXT,    -- InStock, SoldOut, Free

  -- schema.org dateCreated / dateModified
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_locality ON events(location_locality);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_short_code ON events(short_code);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(event_status);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_identifier);

-- Users table (schema.org Person)
CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  alternate_name TEXT UNIQUE,   -- handle/username

  -- schema.org image
  image TEXT,
  description TEXT,

  -- schema.org PostalAddress
  address_locality TEXT,
  address_country TEXT,

  -- Preferences (JSON)
  interests TEXT, -- JSON array of categories

  -- Stats
  events_attended INTEGER DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,

  -- Auth
  stytch_user_id TEXT UNIQUE,
  role TEXT DEFAULT 'user',       -- user, moderator, admin, super_admin
  onboarding_completed BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TEXT,

  -- schema.org dateCreated / dateModified
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_stytch ON users(stytch_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_alternate_name ON users(alternate_name);

-- Event registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'registered', -- pending, registered, approved, rejected, cancelled, attended

  -- Ticket info
  ticket_type TEXT,
  ticket_price REAL,
  ticket_currency TEXT,

  -- Timestamps
  registered_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,
  checked_in_at TEXT,

  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- User follows (for "friends attending")
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  date_created TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);

-- Event views for analytics
CREATE TABLE IF NOT EXISTS event_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  viewed_at TEXT DEFAULT (datetime('now')),
  source TEXT -- web, app, share
);

CREATE INDEX IF NOT EXISTS idx_event_views_event ON event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_viewed_at ON event_views(viewed_at);

-- Event reviews
CREATE TABLE IF NOT EXISTS event_reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified_attendee BOOLEAN DEFAULT FALSE,
  date_created TEXT DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_event ON event_reviews(event_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  referrer_user_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  referred_user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, converted
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

-- Search queries for analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  results_count INTEGER,
  searched_at TEXT DEFAULT (datetime('now'))
);

-- AI conversation history
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE CASCADE,
  messages TEXT NOT NULL, -- JSON array of messages
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
