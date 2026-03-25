-- Soft deletes: add deleted_at column
ALTER TABLE events ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE registrations ADD COLUMN deleted_at TEXT;

-- Audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Categories table (moving from hardcoded)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Email preferences for users
ALTER TABLE users ADD COLUMN email_preferences TEXT DEFAULT '{"marketing":true,"reminders":true,"updates":true}';

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  name,
  description,
  location_locality,
  category,
  keywords,
  content=events,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS events_fts_insert AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, name, description, location_locality, category, keywords)
  VALUES (new.rowid, new.name, new.description, new.location_locality, new.category, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_delete AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, name, description, location_locality, category, keywords)
  VALUES ('delete', old.rowid, old.name, old.description, old.location_locality, old.category, old.keywords);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_update AFTER UPDATE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, name, description, location_locality, category, keywords)
  VALUES ('delete', old.rowid, old.name, old.description, old.location_locality, old.category, old.keywords);
  INSERT INTO events_fts(rowid, name, description, location_locality, category, keywords)
  VALUES (new.rowid, new.name, new.description, new.location_locality, new.category, new.keywords);
END;
