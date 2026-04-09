-- Migration 011: Tracked links for click analytics
-- Every external link (meeting URLs, venue directions, ticket URLs) gets a
-- short code that routes through nhimbe for click tracking and attribution.

CREATE TABLE IF NOT EXISTS tracked_links (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,              -- 8-char short code (e.g., "aB3xK9mQ")
  event_id TEXT REFERENCES events(_id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,               -- the actual destination URL
  link_type TEXT NOT NULL,                -- meeting_url, directions, ticket, website
  created_by TEXT REFERENCES users(_id) ON DELETE SET NULL,
  click_count INTEGER DEFAULT 0,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracked_links_code ON tracked_links(code);
CREATE INDEX IF NOT EXISTS idx_tracked_links_event ON tracked_links(event_id);

-- Click log for detailed analytics (who clicked, when, from where)
CREATE TABLE IF NOT EXISTS link_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id TEXT NOT NULL REFERENCES tracked_links(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  referrer_url TEXT,
  user_agent TEXT,
  clicked_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_event ON link_clicks(event_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_date ON link_clicks(clicked_at);
