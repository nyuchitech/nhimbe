-- Add ticketing fields to events table
-- Free events on nhimbe, paid events link to external ticketing

ALTER TABLE events ADD COLUMN is_free BOOLEAN DEFAULT TRUE;
ALTER TABLE events ADD COLUMN ticket_url TEXT;
