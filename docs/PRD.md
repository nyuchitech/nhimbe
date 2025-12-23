# nhimbe

> *"Together we gather, together we grow"*

**Product Requirements Document**
Version 1.0 | December 2025
A Mukoko Product

-----

## Executive Summary

Nhimbe (pronounced /ˈnhimbɛ/) is an African events and gatherings platform inspired by the traditional Shona practice of communal work. The platform embodies Ubuntu philosophy—collective effort for shared benefit—while delivering a modern, beautiful event management experience.

As part of the Mukoko ecosystem, nhimbe operates with a hybrid distribution model: standalone web presence at nhimbe.com with deep integration into the Mukoko Super App, creating unreplicable network effects through shared identity (Mukoko ID), social graph (Connect), and content (Clips).

### Vision Statement

*To become Africa's premier gatherings platform where communities come together to celebrate, connect, and create shared experiences—powered by Ubuntu principles and modern technology.*

### Key Differentiators

- **Cultural Authenticity:** Purpose-built for African communities with culturally-relevant themes, local payment integration (mobile money, bank transfers), and Ubuntu-inspired design
- **Super App Integration:** Seamless connection with Mukoko ID, Connect, and Clips creating powerful network effects
- **Community-Centric Design:** Combines Luma's polished UX with Partiful's social engagement and African communal values

-----

## Competitive Analysis

We analyzed four leading event platforms to identify best practices and opportunities for differentiation.

|Platform      |Strengths                                                        |Weaknesses                                                          |nhimbe Opportunity                                                  |
|--------------|-----------------------------------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------|
|**Luma**      |Beautiful UI, 40+ themes, robust API, community calendars        |Western-centric, limited cultural customization, $59/mo premium     |African-inspired themes, local payment methods, competitive pricing |
|**Partiful**  |Playful aesthetic, SMS-first, free, viral "Mutuals" feature      |Limited professional features, no ticketing, casual-only positioning|Social features for all event types, WhatsApp integration for Africa|
|**Meetup**    |Massive 60M user base, strong group management, established brand|Dated UI, expensive for organizers, reliability issues              |Modern UX, free for organizers, super app community integration     |
|**Eventbrite**|Robust ticketing, payment processing, large venue support        |Clunky interface, high fees, limited community features             |Beautiful event pages, lower fees, community-first approach         |

-----

## Core Features

### 1. Beautiful Event Pages

Create stunning event pages in under 60 seconds with culturally-rich design options.

- Single-page creation flow with smart defaults
- 40+ themes including African patterns, festival vibes, and cultural celebrations
- Custom cover image upload with intelligent cropping
- Rich text descriptions with markdown support
- Mobile-optimized responsive design

### 2. Smart RSVP & Ticketing

Flexible attendance management for free and paid events.

- Free events: Yes/No/Maybe RSVP with instant confirmation
- Paid events: Multi-tier ticketing with early bird pricing
- Capacity limits with automatic waitlist management
- Guest approval workflows for private events
- Local payment integration: EcoCash, Paynow, M-Pesa, cards, bank transfers

### 3. Guest Communication

Keep attendees informed and engaged before, during, and after events.

- Automatic reminders: Email/SMS 24 hours and 1 hour before
- Text blasts for real-time updates and announcements
- Event-specific chat for attendee coordination
- Calendar integration: Google, Apple, Outlook with one-click add
- WhatsApp sharing with rich previews

### 4. Event Day Experience

Seamless check-in and engagement tools for hosts and attendees.

- QR code tickets with offline validation
- Host check-in app with scanning and manual entry
- Real-time attendance dashboard
- Photo sharing to Clips (Mukoko integration)
- Post-event feedback collection

### 5. Event Discovery

Help attendees find events they'll love.

- Location-based personalized feed
- Category filtering: Tech, Culture, Wellness, Social, Professional
- Featured and trending events
- Follow organizers for updates
- "Friends attending" social proof signals

-----

## Key User Journeys

### Journey 1: Create Event (60 seconds)

1. Tap "Create Event" button
1. Single-page form appears with smart defaults
1. Enter title, select date/time via quick-select overlays
1. Choose from theme gallery or upload custom cover
1. Add location via map search or mark as "Online"
1. Set visibility (public/private) and capacity
1. Tap "Publish" → Immediate "Invite Guests" prompt

### Journey 2: Discover & RSVP

1. Open nhimbe app → Personalized discovery feed loads
1. Browse by category, city, or followed organizers
1. Tap event card → Beautiful detail page with all info
1. See "Friends attending" social signals
1. RSVP or purchase ticket with local payment options
1. Confirmation + one-click "Add to Calendar"
1. Share via WhatsApp or copy link

-----

## Technical Architecture

|Layer             |Technology Stack                                                    |
|------------------|--------------------------------------------------------------------|
|**Web Platform**  |Next.js 15, React 19, TypeScript — nhimbe.com (standalone PWA)      |
|**Mobile**        |React Native — Integrated in Mukoko Super App                       |
|**Backend**       |Node.js, PostgreSQL, Redis — Shared Mukoko services                 |
|**Auth**          |Mukoko ID SSO (OAuth 2.0, Magic Links)                              |
|**Payments**      |Multi-provider: Stripe, PayPal, Paynow, EcoCash, M-Pesa             |
|**Infrastructure**|Cloudflare Workers + Pages, D1 (SQLite), R2 (media), Durable Objects|
|**Messaging**     |Resend (email), Africa's Talking (SMS), WhatsApp Business API       |

-----

## Product Roadmap

### Phase 1: Foundation (Q1 2025 — 8 weeks)

**Goal:** Launch MVP with core event creation and RSVP functionality

- Event creation with themes and customization
- RSVP system for free events
- Guest list management
- Email notifications and reminders
- Basic event discovery feed
- Mukoko ID integration for authentication

### Phase 2: Growth (Q2 2025 — 8 weeks)

**Goal:** Add ticketing, payments, and super app integration

- Paid ticketing with local payment methods
- Enhanced event discovery with categories and search
- QR code check-in system
- Event chat for attendee coordination
- Mukoko Super App integration (Connect social graph)
- WhatsApp Business API integration

### Phase 3: Scale (Q3-Q4 2025 — 16 weeks)

**Goal:** Community features, analytics, and monetization

- Community calendars with member subscriptions
- Recurring events and series support
- Virtual event support (Zoom, Google Meet integration)
- Analytics dashboard for organizers
- Public API and embeddable widgets
- Premium features and Pro tier monetization

-----

## Success Metrics

Year 1 targets for measuring product-market fit and growth.

|Metric                      |Target    |Rationale        |
|----------------------------|----------|-----------------|
|Monthly Active Users        |**50,000**|Regional scale   |
|Events Created/Month        |**5,000** |Content velocity |
|RSVP Conversion Rate        |**>40%**  |Page → RSVP      |
|Show Rate                   |**>70%**  |RSVP → Check-in  |
|Organizer Retention (30-day)|**>60%**  |Repeat creation  |
|Net Promoter Score          |**>50**   |User satisfaction|

-----

## Conclusion

Nhimbe represents a significant opportunity to bring world-class event management to African communities while honoring cultural traditions and communal values. By combining the best practices from leading platforms like Luma, Partiful, and Meetup with deep integration into the Mukoko ecosystem, we can create a differentiated product that serves underserved markets.

The hybrid distribution model—standalone web presence plus super app integration—provides flexibility for growth while leveraging network effects from the broader Mukoko platform. Our focus on local payment methods, culturally-relevant design, and Ubuntu-inspired community features positions nhimbe to become the definitive gatherings platform for Africa.

*"Ndiri nekuti tiri" — I am because we are. Together we gather, together we grow.*

-----

**nhimbe** | A Mukoko Product | [nhimbe.com](https://nhimbe.com)

© 2025 Nyuchi Africa
