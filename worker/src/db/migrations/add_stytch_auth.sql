-- Migration: Stytch auth fields
-- stytch_user_id, email_verified, onboarding_completed, last_login_at are in schema.sql for new installs.
-- No-op for fresh installs; retained for upgrade path from pre-schema.org databases.

-- If upgrading from old schema, run these manually:
-- ALTER TABLE users ADD COLUMN stytch_user_id TEXT;
-- ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN last_login_at TEXT;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stytch_user_id ON users(stytch_user_id);

SELECT 1; -- placeholder so migration file is valid SQL
