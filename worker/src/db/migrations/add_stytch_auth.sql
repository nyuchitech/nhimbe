-- Migration: Add Stytch authentication fields
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/add_stytch_auth.sql

-- Add Stytch user ID for identity mapping
ALTER TABLE users ADD COLUMN stytch_user_id TEXT;

-- Track email verification status
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Track onboarding completion
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

-- Track last login timestamp
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Create unique index for Stytch user ID lookups (enforces uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stytch_user_id ON users(stytch_user_id);
