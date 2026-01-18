-- Migration: Add role field to users table
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/004_add_user_roles.sql

-- Add role column to users table
-- Roles: user, moderator, admin, super_admin
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Add onboarding_completed column if not exists
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add stytch_user_id column for OAuth linking
ALTER TABLE users ADD COLUMN stytch_user_id TEXT;

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create support_tickets table for admin dashboard
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- general, bug, feature, billing, other
  priority TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT DEFAULT 'open', -- open, pending, resolved
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create support_messages table for ticket threads
CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- user, admin
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
