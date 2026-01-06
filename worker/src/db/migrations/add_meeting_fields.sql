-- Migration: Add meeting fields for online events
-- Run with: wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/add_meeting_fields.sql

-- Add meeting_url column
ALTER TABLE events ADD COLUMN meeting_url TEXT;

-- Add meeting_platform column
ALTER TABLE events ADD COLUMN meeting_platform TEXT;
