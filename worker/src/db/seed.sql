-- nhimbe D1 Database Seed Data
-- Run with: wrangler d1 execute mukoko-nhimbe-db --local --file=./src/db/seed.sql

-- Sample Events for demo purposes
INSERT OR REPLACE INTO events (
  id, short_code, slug, title, description,
  date_day, date_month, date_full, date_time, date_iso,
  location_venue, location_address, location_city, location_country,
  category, tags, cover_gradient,
  attendee_count, theme_id,
  host_name, host_handle, host_initials, host_event_count
) VALUES
(
  'sample-1', 'SMT1', 'sample-tech-meetup',
  'Tech Community Meetup',
  'Join us for networking and talks on the latest in technology.

This is a sample event to demonstrate the nhimbe platform. When you create your own events, they will appear here instead.

The nhimbe platform makes it easy to create, share, and manage events. Whether you''re hosting a small workshop or a large festival, we''ve got you covered.',
  '15', 'Jan', 'January 15, 2025', '6:00 PM', '2025-01-15T18:00:00Z',
  'Innovation Hub', '123 Tech Street', 'Harare', 'Zimbabwe',
  'Sample', '["technology", "networking", "sample"]',
  'linear-gradient(135deg, #00574B 0%, #64FFDA 100%)',
  45, 'malachite',
  'nhimbe Team', '@nhimbe', 'NT', 5
),
(
  'sample-2', 'SMT2', 'sample-art-exhibition',
  'Contemporary Art Exhibition',
  'Explore works from emerging African artists.

This is a sample event to demonstrate the nhimbe platform. When you create your own events, they will appear here instead.

The exhibition features paintings, sculptures, and mixed media works from artists across the continent. Join us for the opening reception.',
  '20', 'Jan', 'January 20, 2025', '10:00 AM', '2025-01-20T10:00:00Z',
  'National Gallery', '25 Art Avenue', 'Cape Town', 'South Africa',
  'Sample', '["art", "culture", "sample"]',
  'linear-gradient(135deg, #B388FF 0%, #4B0082 100%)',
  120, 'tanzanite',
  'nhimbe Team', '@nhimbe', 'NT', 5
),
(
  'sample-3', 'SMT3', 'sample-music-festival',
  'Ubuntu Music Festival',
  'A celebration of African music and dance.

This is a sample event to demonstrate the nhimbe platform. When you create your own events, they will appear here instead.

Experience the vibrant sounds of Africa with performances by local and international artists. Food vendors, craft markets, and family-friendly activities all day.',
  '25', 'Jan', 'January 25, 2025', '2:00 PM', '2025-01-25T14:00:00Z',
  'Freedom Park', '1 Unity Road', 'Harare', 'Zimbabwe',
  'Sample', '["music", "festival", "sample"]',
  'linear-gradient(135deg, #FFD740 0%, #8B5A00 100%)',
  500, 'gold',
  'nhimbe Team', '@nhimbe', 'NT', 5
),
(
  'sample-4', 'SMT4', 'sample-workshop',
  'Startup Workshop: Building Your MVP',
  'Learn how to build and launch your minimum viable product.

This is a sample event to demonstrate the nhimbe platform. When you create your own events, they will appear here instead.

In this hands-on workshop, you''ll learn the fundamentals of product development, from ideation to launch. Bring your laptop and be ready to build!',
  '28', 'Jan', 'January 28, 2025', '9:00 AM', '2025-01-28T09:00:00Z',
  'Startup Hub', '88 Business Park', 'Johannesburg', 'South Africa',
  'Sample', '["startup", "workshop", "sample"]',
  'linear-gradient(135deg, #64FFDA 0%, #00574B 100%)',
  30, 'malachite',
  'nhimbe Team', '@nhimbe', 'NT', 5
);

-- Add a sample user
INSERT OR REPLACE INTO users (
  id, email, name, handle, city, country, interests, events_attended, events_hosted
) VALUES
(
  'demo-user', 'demo@nhimbe.com', 'Demo User', '@demo',
  'Harare', 'Zimbabwe', '["technology", "music", "art"]', 0, 0
);
