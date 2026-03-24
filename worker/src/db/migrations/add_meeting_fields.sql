-- Migration: Meeting fields for online events
-- meeting_url and meeting_platform are already in schema.sql for new installs.
-- No-op for fresh installs; retained for upgrade path from pre-schema.org databases.

-- If upgrading from old schema (id-based), run these:
-- ALTER TABLE events ADD COLUMN meeting_url TEXT;
-- ALTER TABLE events ADD COLUMN meeting_platform TEXT;

SELECT 1; -- placeholder so migration file is valid SQL
