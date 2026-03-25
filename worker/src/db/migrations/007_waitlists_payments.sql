-- Waitlists
CREATE TABLE IF NOT EXISTS waitlists (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TEXT DEFAULT (datetime('now')),
  promoted_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(_id),
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_waitlist_event ON waitlists(event_id, position);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  refunded_at TEXT,
  FOREIGN KEY (registration_id) REFERENCES registrations(id),
  FOREIGN KEY (event_id) REFERENCES events(_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_registration ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
