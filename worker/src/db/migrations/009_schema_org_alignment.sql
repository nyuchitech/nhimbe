-- Migration 009: schema.org alignment
-- Renames columns to match schema.org vocabulary consistently.
-- Uses ALTER TABLE RENAME COLUMN (SQLite 3.25.0+, supported by D1).
--
-- Convention: all timestamps use date_created/date_modified (schema.org dateCreated/dateModified)
-- Convention: all location fields use address_locality/address_country (schema.org PostalAddress)
-- Convention: review text uses review_body (schema.org reviewBody)

-- ============================================================================
-- event_reviews: comment → review_body (schema.org Review.reviewBody)
-- ============================================================================
ALTER TABLE event_reviews RENAME COLUMN comment TO review_body;

-- ============================================================================
-- event_series: title → name (schema.org Thing.name)
--              created_at → date_created, updated_at → date_modified
-- ============================================================================
ALTER TABLE event_series RENAME COLUMN title TO name;
ALTER TABLE event_series RENAME COLUMN created_at TO date_created;
ALTER TABLE event_series RENAME COLUMN updated_at TO date_modified;

-- ============================================================================
-- analytics_events: city → address_locality, country → address_country
--                   (schema.org PostalAddress)
-- ============================================================================
ALTER TABLE analytics_events RENAME COLUMN city TO address_locality;
ALTER TABLE analytics_events RENAME COLUMN country TO address_country;

-- ============================================================================
-- community_stats: city → address_locality (schema.org PostalAddress)
-- ============================================================================
ALTER TABLE community_stats RENAME COLUMN city TO address_locality;

-- ============================================================================
-- audit_logs: created_at → date_created (schema.org dateCreated)
-- ============================================================================
ALTER TABLE audit_logs RENAME COLUMN created_at TO date_created;

-- ============================================================================
-- categories: created_at → date_created (schema.org dateCreated)
-- ============================================================================
ALTER TABLE categories RENAME COLUMN created_at TO date_created;

-- ============================================================================
-- waitlists: created_at → date_created (schema.org dateCreated)
-- ============================================================================
ALTER TABLE waitlists RENAME COLUMN created_at TO date_created;

-- ============================================================================
-- payments: created_at → date_created (schema.org dateCreated)
-- ============================================================================
ALTER TABLE payments RENAME COLUMN created_at TO date_created;

-- ============================================================================
-- support_tickets: created_at → date_created, updated_at → date_modified
-- ============================================================================
-- Note: These were created with date_created/date_modified in migration 004,
-- so this rename only applies if the columns were named created_at.
-- Using IF EXISTS pattern not available in SQLite, so these are idempotent
-- by virtue of failing silently if columns already have the correct names.

-- ============================================================================
-- support_messages: created_at → date_created
-- ============================================================================
-- Same note as above — migration 004 used date_created already.
