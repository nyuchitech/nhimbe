CREATE TABLE IF NOT EXISTS event_series (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL,
  host_id TEXT NOT NULL,
  template_event_id TEXT,
  max_occurrences INTEGER DEFAULT 52,
  ends_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (host_id) REFERENCES users(_id)
);

CREATE INDEX IF NOT EXISTS idx_series_host ON event_series(host_id);

ALTER TABLE events ADD COLUMN series_id TEXT REFERENCES event_series(id);
ALTER TABLE events ADD COLUMN series_index INTEGER;
