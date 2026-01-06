-- nhimbe D1 Database Schema
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/schema.sql

-- Mineral themes (reference table)
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gradient TEXT NOT NULL,
  colors TEXT NOT NULL, -- JSON array of 3 colors for Three.js
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default mineral themes
INSERT OR IGNORE INTO themes (id, name, gradient, colors) VALUES
  ('malachite', 'Malachite', 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)', '["#004D40", "#00796B", "#64FFDA"]'),
  ('tanzanite', 'Tanzanite', 'linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)', '["#1A0A2E", "#4B0082", "#B388FF"]'),
  ('gold', 'Gold', 'linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)', '["#5D4037", "#8B5A00", "#FFD740"]'),
  ('tigers-eye', 'Tiger''s Eye', 'linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)', '["#4A2C00", "#8B4513", "#D4A574"]'),
  ('obsidian', 'Obsidian', 'linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)', '["#0A0A0A", "#1E1E1E", "#3A3A3A"]');

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Date fields (stored as JSON)
  date_day TEXT NOT NULL,
  date_month TEXT NOT NULL,
  date_full TEXT NOT NULL,
  date_time TEXT NOT NULL,
  date_iso TEXT NOT NULL,

  -- Location fields
  location_venue TEXT NOT NULL,
  location_address TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_country TEXT NOT NULL,

  -- Categorization
  category TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array

  -- Media
  cover_image TEXT,
  cover_gradient TEXT,

  -- Theme (mineral gradients: malachite, tanzanite, gold, tigers-eye, obsidian)
  theme_id TEXT DEFAULT 'malachite',

  -- Stats
  attendee_count INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  capacity INTEGER,

  -- Flags
  is_online BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  is_cancelled BOOLEAN DEFAULT FALSE,
  require_approval BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public', -- public, private

  -- Online meeting (for virtual events)
  meeting_url TEXT,
  meeting_platform TEXT, -- zoom, google_meet, teams, other

  -- Host (stored as JSON)
  host_name TEXT NOT NULL,
  host_handle TEXT NOT NULL,
  host_initials TEXT NOT NULL,
  host_event_count INTEGER DEFAULT 0,

  -- Pricing (optional)
  price_amount REAL,
  price_currency TEXT,
  price_label TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_city ON events(location_city);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_iso);
CREATE INDEX IF NOT EXISTS idx_events_short_code ON events(short_code);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  handle TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,

  -- Location
  city TEXT,
  country TEXT,

  -- Preferences (JSON)
  interests TEXT, -- JSON array of categories

  -- Stats
  events_attended INTEGER DEFAULT 0,
  events_hosted INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Event registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'registered', -- pending, registered, approved, rejected, cancelled, attended

  -- Ticket info
  ticket_type TEXT,
  ticket_price REAL,
  ticket_currency TEXT,

  -- Timestamps
  registered_at TEXT DEFAULT (datetime('now')),
  cancelled_at TEXT,

  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);

-- User follows (for "friends attending")
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);

-- Event views for analytics
CREATE TABLE IF NOT EXISTS event_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TEXT DEFAULT (datetime('now')),
  source TEXT -- web, app, share
);

CREATE INDEX IF NOT EXISTS idx_event_views_event ON event_views(event_id);

-- Search queries for analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  results_count INTEGER,
  searched_at TEXT DEFAULT (datetime('now'))
);

-- AI conversation history (optional, for personalization)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  messages TEXT NOT NULL, -- JSON array of messages
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
