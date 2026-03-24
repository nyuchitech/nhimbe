-- Migration: Ticketing/offers fields (schema.org Offer model)
-- offer_price, offer_price_currency, offer_url, offer_availability are in schema.sql for new installs.
-- No-op for fresh installs; retained for upgrade path from pre-schema.org databases.

-- If upgrading from old schema, run these manually:
-- ALTER TABLE events ADD COLUMN offer_price REAL;
-- ALTER TABLE events ADD COLUMN offer_price_currency TEXT;
-- ALTER TABLE events ADD COLUMN offer_url TEXT;
-- ALTER TABLE events ADD COLUMN offer_availability TEXT;

SELECT 1; -- placeholder so migration file is valid SQL
