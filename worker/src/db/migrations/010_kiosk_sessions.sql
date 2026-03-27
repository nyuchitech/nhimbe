-- Migration 010: Kiosk/signage pairing and sessions
-- TV-style pairing flow for on-site check-in kiosks and digital signage

-- Pairing codes (short-lived, 5 min TTL enforced in application)
CREATE TABLE IF NOT EXISTS kiosk_pairings (
  code TEXT PRIMARY KEY,                  -- 6-character pairing code
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, expired
  screen_type TEXT NOT NULL DEFAULT 'kiosk', -- kiosk, signage-host, signage-admin
  event_id TEXT REFERENCES events(_id) ON DELETE CASCADE,
  event_name TEXT,
  host_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  host_name TEXT,
  session_token TEXT UNIQUE,
  date_created TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL                -- ISO 8601 expiry
);

CREATE INDEX IF NOT EXISTS idx_kiosk_pairings_status ON kiosk_pairings(status);
CREATE INDEX IF NOT EXISTS idx_kiosk_pairings_expires ON kiosk_pairings(expires_at);

-- Active kiosk/signage sessions (24h TTL enforced in application)
CREATE TABLE IF NOT EXISTS kiosk_sessions (
  token TEXT PRIMARY KEY,                 -- 64-char hex session token
  event_id TEXT NOT NULL REFERENCES events(_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  screen_type TEXT NOT NULL DEFAULT 'kiosk', -- kiosk, signage-host, signage-admin
  host_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  paired_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL                -- ISO 8601 expiry
);

CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_event ON kiosk_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_expires ON kiosk_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_type ON kiosk_sessions(screen_type);
