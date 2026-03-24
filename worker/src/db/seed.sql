-- nhimbe D1 Seed Data (schema.org-aligned)
-- Run with: wrangler d1 execute mukoko-nhimbe-db --local --file=./src/db/seed.sql

-- Sample Events
INSERT OR REPLACE INTO events (
  _id, short_code, slug,
  name, description,
  start_date, end_date,
  date_display_day, date_display_month, date_display_full, date_display_time,
  location_name, location_street_address, location_locality, location_country,
  category, keywords, cover_gradient,
  attendee_count, maximum_attendee_capacity,
  event_attendance_mode, event_status, is_published,
  organizer_name, organizer_identifier, organizer_initials, organizer_event_count
) VALUES
(
  'sample-1', 'SMT1', 'sample-tech-meetup',
  'Tech Community Meetup',
  'Join us for networking and talks on the latest in technology.

This is a sample event to demonstrate the nhimbe platform. When you create your own events, they will appear here instead.',
  '2026-04-15T18:00:00Z', '2026-04-15T21:00:00Z',
  '15', 'Apr', 'Wednesday, April 15, 2026', '6:00 PM — 9:00 PM',
  'Innovation Hub', '12 Enterprise Road', 'Harare', 'ZW',
  'Tech', '["tech","networking","developers"]', 'linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)',
  47, 120,
  'OfflineEventAttendanceMode', 'EventScheduled', 1,
  'Nyuchi Tech', 'nyuchitech', 'NT', 12
),
(
  'sample-2', 'ART2', 'harare-arts-festival',
  'Harare Arts Festival 2026',
  'A celebration of Zimbabwean art, music, and culture. Experience local talent across multiple stages and gallery spaces.',
  '2026-05-01T10:00:00Z', '2026-05-03T22:00:00Z',
  '1', 'May', 'Friday, May 1, 2026', '10:00 AM — 10:00 PM',
  'National Gallery of Zimbabwe', '20 Julius Nyerere Way', 'Harare', 'ZW',
  'Arts & Culture', '["art","music","culture","zimbabwe"]', 'linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)',
  213, 500,
  'OfflineEventAttendanceMode', 'EventScheduled', 1,
  'Arts Council Zimbabwe', 'aczbwe', 'ACZ', 5
),
(
  'sample-3', 'RUN3', 'sunrise-5k-run',
  'Sunrise 5K Community Run',
  'Start your weekend right with a scenic 5K run through the city. All fitness levels welcome. Registration includes a T-shirt and refreshments.',
  '2026-04-26T06:00:00Z', '2026-04-26T09:00:00Z',
  '26', 'Apr', 'Sunday, April 26, 2026', '6:00 AM — 9:00 AM',
  'Harare Sports Club', 'Old Mutual Avenue', 'Harare', 'ZW',
  'Health & Fitness', '["running","fitness","community","5k"]', 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)',
  89, 200,
  'OfflineEventAttendanceMode', 'EventScheduled', 1,
  'Run Harare', 'runharare', 'RH', 8
);

-- Sample user
INSERT OR REPLACE INTO users (
  _id, email, name, alternate_name,
  address_locality, address_country,
  interests, role, onboarding_completed, stytch_user_id,
  date_created
) VALUES (
  'usr-dev-001', 'dev@nhimbe.com', 'Dev User', 'devuser',
  'Harare', 'ZW',
  '["Tech","Arts & Culture","Health & Fitness"]',
  'admin', 1, 'stytch-dev-placeholder',
  datetime('now')
);
