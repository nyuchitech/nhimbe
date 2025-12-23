export interface EventLocation {
  venue: string;
  address: string;
  city: string;
  country: string;
}

export interface Event {
  id: string;
  shortCode: string; // Random 8-char code for URLs
  title: string;
  slug: string;
  date: { day: string; month: string; full: string; time: string; iso: string };
  location: EventLocation;
  category: string; // Single category
  tags: string[]; // Multiple tags
  coverImage?: string;
  coverGradient?: string;
  attendeeCount: number;
  friendsCount?: number;
  description: string;
  host: { name: string; handle: string; initials: string; eventCount: number };
  price?: { amount: number; currency: string; label: string };
  friends?: { name: string; gradient: string }[];
  capacity?: number;
  isOnline?: boolean;
}

export const categories = [
  "Tech",
  "Culture",
  "Wellness",
  "Social",
  "Professional",
  "Music",
  "Food & Drink",
  "Sports",
  "Community",
  "Education",
];

export const cities = [
  { city: "Harare", country: "Zimbabwe" },
  { city: "Bulawayo", country: "Zimbabwe" },
  { city: "Victoria Falls", country: "Zimbabwe" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Nairobi", country: "Kenya" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Accra", country: "Ghana" },
];

export const events: Event[] = [
  {
    id: "african-tech-summit-2025",
    shortCode: "aTs25xKp",
    slug: "african-tech-summit-2025",
    title: "African Tech Summit 2025",
    date: {
      day: "28",
      month: "Dec",
      full: "Saturday, December 28, 2025",
      time: "9:00 AM - 6:00 PM (CAT)",
      iso: "2025-12-28T09:00:00+02:00",
    },
    location: {
      venue: "Rainbow Towers Hotel",
      address: "Pennefather Ave",
      city: "Harare",
      country: "Zimbabwe",
    },
    category: "Tech",
    tags: ["startup", "innovation", "networking", "AI", "fintech"],
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    attendeeCount: 247,
    friendsCount: 3,
    capacity: 500,
    description: `Join us for the biggest tech gathering in Zimbabwe! The African Tech Summit brings together innovators, entrepreneurs, investors, and tech enthusiasts from across the continent.

This year's theme: "Building Africa's Digital Future"

Featured speakers include leaders from Econet, Cassava Technologies, and top VCs investing in African startups. Network with 500+ attendees, participate in workshops, and discover the latest innovations shaping our continent.`,
    host: {
      name: "Zimbabwe Tech Hub",
      handle: "@zimtechhub",
      initials: "ZT",
      eventCount: 12,
    },
    price: { amount: 25, currency: "USD", label: "Early Bird Ticket" },
    friends: [
      { name: "Sarah M.", gradient: "from-secondary to-primary" },
      { name: "James K.", gradient: "from-accent to-[#FF6B6B]" },
      { name: "Lisa T.", gradient: "from-primary to-[#00B0FF]" },
    ],
  },
  {
    id: "amapiano-night-nye",
    shortCode: "nYe31vFx",
    slug: "amapiano-night-nye-edition",
    title: "Amapiano Night: NYE Edition",
    date: {
      day: "31",
      month: "Dec",
      full: "Tuesday, December 31, 2025",
      time: "8:00 PM - 4:00 AM (CAT)",
      iso: "2025-12-31T20:00:00+02:00",
    },
    location: {
      venue: "The Venue",
      address: "Park Way Drive",
      city: "Victoria Falls",
      country: "Zimbabwe",
    },
    category: "Music",
    tags: ["amapiano", "nye", "party", "dj", "dance"],
    coverImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    attendeeCount: 89,
    capacity: 200,
    description:
      "Ring in the new year with the best Amapiano beats! Live DJs, great vibes, and an unforgettable night at Victoria Falls.",
    host: {
      name: "Vic Falls Events",
      handle: "@vicfallsevents",
      initials: "VF",
      eventCount: 24,
    },
    price: { amount: 50, currency: "USD", label: "General Admission" },
  },
  {
    id: "sunrise-yoga-chivero",
    shortCode: "yGa15hRm",
    slug: "sunrise-yoga-lake-chivero",
    title: "Sunrise Yoga at Lake Chivero",
    date: {
      day: "15",
      month: "Jan",
      full: "Wednesday, January 15, 2025",
      time: "5:30 AM - 7:30 AM (CAT)",
      iso: "2025-01-15T05:30:00+02:00",
    },
    location: {
      venue: "Lake Chivero Recreational Park",
      address: "Lake Chivero",
      city: "Harare",
      country: "Zimbabwe",
    },
    category: "Wellness",
    tags: ["yoga", "meditation", "nature", "fitness", "mindfulness"],
    coverGradient: "linear-gradient(135deg, #4B0082, #004D40)",
    attendeeCount: 32,
    friendsCount: 1,
    capacity: 50,
    description:
      "Start your day with peace and tranquility. Join us for a sunrise yoga session overlooking the beautiful Lake Chivero. All levels welcome. Mats provided.",
    host: {
      name: "Harare Wellness",
      handle: "@hararewellness",
      initials: "HW",
      eventCount: 8,
    },
    friends: [{ name: "Tanya M.", gradient: "from-primary to-secondary" }],
  },
  {
    id: "startup-founders-meetup",
    shortCode: "sFm24kLp",
    slug: "startup-founders-meetup-harare",
    title: "Startup Founders Meetup",
    date: {
      day: "24",
      month: "Dec",
      full: "Tuesday, December 24, 2025",
      time: "6:00 PM - 9:00 PM (CAT)",
      iso: "2025-12-24T18:00:00+02:00",
    },
    location: {
      venue: "Impact Hub",
      address: "16 Cork Road, Avondale",
      city: "Harare",
      country: "Zimbabwe",
    },
    category: "Professional",
    tags: ["startup", "founders", "networking", "entrepreneurship"],
    coverGradient: "linear-gradient(135deg, #004D40, #00796B)",
    attendeeCount: 45,
    capacity: 60,
    description:
      "Connect with fellow founders, share your journey, and learn from each other. Casual networking in a relaxed environment. Refreshments provided.",
    host: {
      name: "Impact Hub Harare",
      handle: "@impactharare",
      initials: "IH",
      eventCount: 32,
    },
  },
  {
    id: "poetry-wine-evening",
    shortCode: "pWe27bNx",
    slug: "poetry-wine-evening-book-cafe",
    title: "Poetry & Wine Evening",
    date: {
      day: "27",
      month: "Dec",
      full: "Friday, December 27, 2025",
      time: "7:00 PM - 10:00 PM (CAT)",
      iso: "2025-12-27T19:00:00+02:00",
    },
    location: {
      venue: "Book Café",
      address: "Fife Avenue",
      city: "Harare",
      country: "Zimbabwe",
    },
    category: "Culture",
    tags: ["poetry", "spoken-word", "wine", "art", "literature"],
    coverGradient: "linear-gradient(135deg, #4B0082, #7B1FA2)",
    attendeeCount: 28,
    capacity: 40,
    description:
      "An intimate evening of spoken word, poetry readings, and fine wine. Share your work or simply enjoy the art. Open mic available.",
    host: {
      name: "Book Café",
      handle: "@bookcafeharare",
      initials: "BC",
      eventCount: 56,
    },
  },
  {
    id: "community-cleanup-borrowdale",
    shortCode: "cCb28qWz",
    slug: "community-cleanup-borrowdale",
    title: "Community Clean-Up: Borrowdale",
    date: {
      day: "28",
      month: "Dec",
      full: "Saturday, December 28, 2025",
      time: "7:00 AM - 11:00 AM (CAT)",
      iso: "2025-12-28T07:00:00+02:00",
    },
    location: {
      venue: "Borrowdale Park",
      address: "Borrowdale Road",
      city: "Harare",
      country: "Zimbabwe",
    },
    category: "Community",
    tags: ["volunteer", "environment", "cleanup", "community-service"],
    coverGradient: "linear-gradient(135deg, #5D4037, #8D6E63)",
    attendeeCount: 67,
    friendsCount: 2,
    capacity: 100,
    description:
      "Join your neighbors in keeping Borrowdale beautiful. Gloves and bags provided. Coffee and snacks after! Bring the whole family.",
    host: {
      name: "Borrowdale Residents",
      handle: "@borrowdalera",
      initials: "BR",
      eventCount: 6,
    },
    friends: [
      { name: "Mike T.", gradient: "from-primary to-[#00B0FF]" },
      { name: "Grace N.", gradient: "from-accent to-secondary" },
    ],
  },
  {
    id: "jozi-tech-meetup",
    shortCode: "jTm15xRk",
    slug: "johannesburg-tech-meetup",
    title: "Joburg Tech & Startups Meetup",
    date: {
      day: "20",
      month: "Jan",
      full: "Monday, January 20, 2025",
      time: "6:00 PM - 9:00 PM (SAST)",
      iso: "2025-01-20T18:00:00+02:00",
    },
    location: {
      venue: "Workshop17",
      address: "Sandton City",
      city: "Johannesburg",
      country: "South Africa",
    },
    category: "Tech",
    tags: ["startup", "tech", "networking", "south-africa"],
    coverGradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    attendeeCount: 156,
    capacity: 200,
    description:
      "Monthly gathering of Johannesburg's tech community. Lightning talks, networking, and drinks. All welcome!",
    host: {
      name: "Jozi Tech Community",
      handle: "@jozitech",
      initials: "JT",
      eventCount: 48,
    },
  },
  {
    id: "nairobi-design-week",
    shortCode: "nDw10pLm",
    slug: "nairobi-design-week-2025",
    title: "Nairobi Design Week 2025",
    date: {
      day: "10",
      month: "Feb",
      full: "Monday, February 10, 2025",
      time: "10:00 AM - 6:00 PM (EAT)",
      iso: "2025-02-10T10:00:00+03:00",
    },
    location: {
      venue: "Nairobi National Museum",
      address: "Museum Hill",
      city: "Nairobi",
      country: "Kenya",
    },
    category: "Culture",
    tags: ["design", "art", "exhibition", "creative", "kenya"],
    coverImage:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    attendeeCount: 320,
    capacity: 500,
    description:
      "East Africa's largest design festival. Exhibitions, workshops, talks, and networking with creatives from across the continent.",
    host: {
      name: "Nairobi Design Week",
      handle: "@nairobidesign",
      initials: "ND",
      eventCount: 5,
    },
    price: { amount: 20, currency: "USD", label: "Day Pass" },
  },
];

export function getEventById(id: string): Event | undefined {
  return events.find((e) => e.id === id);
}

export function getEventByShortCode(shortCode: string): Event | undefined {
  return events.find((e) => e.shortCode === shortCode);
}

export function getEventsByCity(city: string): Event[] {
  return events.filter((e) => e.location.city === city);
}

export function getEventsByCategory(category: string): Event[] {
  return events.filter((e) => e.category === category);
}

export function getEventsByTag(tag: string): Event[] {
  return events.filter((e) => e.tags.includes(tag));
}

export function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
