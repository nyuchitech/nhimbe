-- nhimbe D1 Database Schema (Schema.org Aligned)
-- D1 serves as a read-only edge cache; MongoDB Atlas is the primary store.
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/schema.sql
--
-- Column names follow schema.org vocabulary where applicable.
-- See container/src/schema.ts for the canonical type definitions.

-- ============================================
-- REFERENCE TABLES
-- ============================================

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

-- ============================================
-- CORE TABLES
-- ============================================

-- Events table (schema.org/Event)
CREATE TABLE IF NOT EXISTS events (
  _id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,                    -- was: title
  description TEXT NOT NULL,

  -- schema.org date fields
  start_date TEXT NOT NULL,              -- was: date_iso (ISO 8601)
  end_date TEXT,
  -- Convenience display fields (derived from start_date)
  date_display_day TEXT NOT NULL,        -- was: date_day
  date_display_month TEXT NOT NULL,      -- was: date_month
  date_display_full TEXT NOT NULL,       -- was: date_full
  date_display_time TEXT NOT NULL,       -- was: date_time

  -- schema.org location (Place or VirtualLocation)
  location_type TEXT NOT NULL DEFAULT 'Place',  -- Place or VirtualLocation
  location_name TEXT,                    -- was: location_venue (Place.name)
  location_street_address TEXT,          -- was: location_address
  location_locality TEXT,                -- was: location_city
  location_country TEXT,                 -- was: location_country
  location_url TEXT,                     -- VirtualLocation.url

  -- Categorization
  category TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',   -- was: tags (JSON array)

  -- Media
  image TEXT,                            -- was: cover_image
  cover_gradient TEXT,

  -- Theme
  theme_id TEXT DEFAULT 'malachite',

  -- Stats
  attendee_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  maximum_attendee_capacity INTEGER,     -- was: capacity

  -- schema.org event metadata
  event_attendance_mode TEXT DEFAULT 'OfflineEventAttendanceMode',
  event_status TEXT DEFAULT 'EventScheduled',
  is_published BOOLEAN DEFAULT TRUE,

  -- Online meeting (for virtual/mixed events)
  meeting_url TEXT,
  meeting_platform TEXT,

  -- schema.org organizer (Person)
  organizer_name TEXT NOT NULL,          -- was: host_name
  organizer_alternate_name TEXT,         -- was: host_handle
  organizer_initials TEXT,               -- was: host_initials
  organizer_identifier TEXT,             -- organizer user ID
  organizer_event_count INTEGER DEFAULT 0, -- was: host_event_count

  -- schema.org offers (Offer)
  offer_price REAL,                      -- was: price_amount
  offer_price_currency TEXT,             -- was: price_currency
  offer_url TEXT,                        -- was: ticket_url
  offer_availability TEXT DEFAULT 'InStock',

  -- schema.org timestamps
  date_created TEXT DEFAULT (datetime('now')),  -- was: created_at
  date_modified TEXT DEFAULT (datetime('now'))  -- was: updated_at
);

CREATE INDEX IF NOT EXISTS idx_events_locality ON events(location_locality);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_short_code ON events(short_code);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(event_status);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);

-- Users table (schema.org/Person)
CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY,                  -- was: id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  alternate_name TEXT UNIQUE,            -- was: handle
  image TEXT,                            -- was: avatar_url
  description TEXT,                      -- was: bio

  -- schema.org address
  address_locality TEXT,                 -- was: city
  address_country TEXT,                  -- was: country

  -- Preferences
  interests TEXT,                        -- JSON array of categories

  -- Stats
  events_attended INTEGER DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,

  -- Role-based access control
  role TEXT DEFAULT 'user',

  -- Auth providers
  stytch_user_id TEXT,
  mukoko_org_member_id TEXT,
  auth_provider TEXT,                    -- email, mukoko_id
  email_verified INTEGER DEFAULT 0,
  onboarding_completed INTEGER DEFAULT 0,
  last_login_at TEXT,

  -- schema.org timestamps
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stytch ON users(stytch_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mukoko ON users(mukoko_org_member_id);

-- Registrations (schema.org/RsvpAction-inspired)
CREATE TABLE IF NOT EXISTS registrations (
  _id TEXT PRIMARY KEY,
  event TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,   -- was: event_id
  agent TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,    -- was: user_id

  -- schema.org rsvpResponse
  rsvp_response TEXT DEFAULT 'registered',

  -- Ticket info
  ticket_type TEXT,
  ticket_price REAL,
  ticket_currency TEXT,

  -- Timestamps
  date_created TEXT DEFAULT (datetime('now')),
  date_cancelled TEXT,

  UNIQUE(event, agent)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event);
CREATE INDEX IF NOT EXISTS idx_registrations_agent ON registrations(agent);

-- User follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
  date_created TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);

-- ============================================
-- REVIEWS & RATINGS (schema.org/Review)
-- ============================================

CREATE TABLE IF NOT EXISTS event_reviews (
  _id TEXT PRIMARY KEY,
  item_reviewed TEXT NOT NULL,           -- was: event_id (references events._id)
  author TEXT NOT NULL,                  -- was: user_id (references users._id)
  rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
  review_body TEXT,                      -- was: comment
  helpful_count INTEGER DEFAULT 0,
  is_verified_attendee INTEGER DEFAULT 0,
  date_published TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now')),
  UNIQUE(item_reviewed, author)
);

CREATE INDEX IF NOT EXISTS idx_reviews_item ON event_reviews(item_reviewed);
CREATE INDEX IF NOT EXISTS idx_reviews_author ON event_reviews(author);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON event_reviews(rating_value);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON event_reviews(date_published);

CREATE TABLE IF NOT EXISTS review_helpful_votes (
  _id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date_created TEXT DEFAULT (datetime('now')),
  UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_helpful_review ON review_helpful_votes(review_id);

-- ============================================
-- REFERRAL SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  _id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT,
  event TEXT,                            -- was: event_id
  referral_code TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'pending',
  date_created TEXT DEFAULT (datetime('now')),
  converted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_event ON referrals(event);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

CREATE TABLE IF NOT EXISTS user_referral_codes (
  user_id TEXT PRIMARY KEY,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  date_created TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- HOST STATISTICS (Aggregated)
-- ============================================

CREATE TABLE IF NOT EXISTS host_stats (
  user_id TEXT PRIMARY KEY,
  events_hosted INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_capacity INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  badges TEXT DEFAULT '[]',
  reputation_score INTEGER DEFAULT 0,
  last_event_at TEXT,
  date_modified TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SUPPORT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS support_tickets (
  _id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_messages (
  _id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(_id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

-- ============================================
-- ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS event_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  viewed_at TEXT DEFAULT (datetime('now')),
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_event_views_event ON event_views(event_id);

CREATE TABLE IF NOT EXISTS search_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  results_count INTEGER,
  searched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  _id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE CASCADE,
  messages TEXT NOT NULL,
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  _id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id TEXT,
  user_id TEXT,
  session_id TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_source ON analytics_events(source);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(date_created);

CREATE TABLE IF NOT EXISTS event_stats_daily (
  _id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  date TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS community_stats (
  _id TEXT PRIMARY KEY,
  city TEXT,
  category TEXT,
  period TEXT NOT NULL,
  period_start TEXT NOT NULL,
  total_events INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_attendance_rate REAL DEFAULT 0,
  trending_score REAL DEFAULT 0,
  top_venues TEXT DEFAULT '[]',
  peak_times TEXT DEFAULT '[]',
  date_modified TEXT DEFAULT (datetime('now')),
  UNIQUE(city, category, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_community_city ON community_stats(city);
CREATE INDEX IF NOT EXISTS idx_community_category ON community_stats(category);
CREATE INDEX IF NOT EXISTS idx_community_period ON community_stats(period, period_start);
