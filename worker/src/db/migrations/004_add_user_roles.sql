-- Migration 004: User roles + support tickets
-- Columns (role, onboarding_completed, stytch_user_id) are already in schema.sql for new installs.
-- This migration adds support_tickets/support_messages which are not in base schema.

-- Support tickets for admin dashboard
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- general, bug, feature, billing, other
  priority TEXT DEFAULT 'medium',  -- low, medium, high
  status TEXT DEFAULT 'open',      -- open, pending, resolved
  date_created TEXT DEFAULT (datetime('now')),
  date_modified TEXT DEFAULT (datetime('now'))
);

-- Support message threads
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- user, admin
  sender_id TEXT REFERENCES users(_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  date_created TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
