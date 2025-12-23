export interface Event {
  id: string;
  title: string;
  date: { day: string; month: string; full: string; time: string };
  location: { name: string; address: string };
  category: string;
  coverImage?: string;
  coverGradient?: string;
  attendeeCount: number;
  friendsCount?: number;
  description: string;
  host: { name: string; handle: string; initials: string; eventCount: number };
  price?: { amount: number; currency: string; label: string };
  friends?: { name: string; gradient: string }[];
}

export const categories = [
  "All Events",
  "Tech",
  "Culture",
  "Wellness",
  "Social",
  "Professional",
  "Music",
  "Food & Drink",
];

export const events: Event[] = [
  {
    id: "african-tech-summit-2025",
    title: "African Tech Summit 2025",
    date: {
      day: "28",
      month: "Dec",
      full: "Saturday, December 28, 2025",
      time: "9:00 AM - 6:00 PM (CAT)",
    },
    location: {
      name: "Rainbow Towers Hotel",
      address: "Pennefather Ave, Harare, Zimbabwe",
    },
    category: "Tech",
    coverImage:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    attendeeCount: 247,
    friendsCount: 3,
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
    title: "Amapiano Night: NYE Edition",
    date: {
      day: "31",
      month: "Dec",
      full: "Tuesday, December 31, 2025",
      time: "8:00 PM - 4:00 AM (CAT)",
    },
    location: {
      name: "The Venue",
      address: "Victoria Falls, Zimbabwe",
    },
    category: "Culture",
    coverImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
    attendeeCount: 89,
    description:
      "Ring in the new year with the best Amapiano beats! Live DJs, great vibes, and an unforgettable night at Victoria Falls.",
    host: {
      name: "Vic Falls Events",
      handle: "@vicfallsevents",
      initials: "VF",
      eventCount: 24,
    },
  },
  {
    id: "sunrise-yoga-chivero",
    title: "Sunrise Yoga at Lake Chivero",
    date: {
      day: "15",
      month: "Jan",
      full: "Wednesday, January 15, 2025",
      time: "5:30 AM - 7:30 AM (CAT)",
    },
    location: {
      name: "Lake Chivero",
      address: "Harare, Zimbabwe",
    },
    category: "Wellness",
    coverGradient: "linear-gradient(135deg, #4B0082, #004D40)",
    attendeeCount: 32,
    friendsCount: 1,
    description:
      "Start your day with peace and tranquility. Join us for a sunrise yoga session overlooking the beautiful Lake Chivero. All levels welcome.",
    host: {
      name: "Harare Wellness",
      handle: "@hararewellness",
      initials: "HW",
      eventCount: 8,
    },
  },
  {
    id: "startup-founders-meetup",
    title: "Startup Founders Meetup",
    date: {
      day: "24",
      month: "Dec",
      full: "Tuesday, December 24, 2025",
      time: "6:00 PM - 9:00 PM (CAT)",
    },
    location: {
      name: "Impact Hub",
      address: "Harare, Zimbabwe",
    },
    category: "Social",
    coverGradient: "linear-gradient(135deg, #004D40, #00796B)",
    attendeeCount: 45,
    description:
      "Connect with fellow founders, share your journey, and learn from each other. Casual networking in a relaxed environment.",
    host: {
      name: "Impact Hub Harare",
      handle: "@impactharare",
      initials: "IH",
      eventCount: 32,
    },
  },
  {
    id: "poetry-wine-evening",
    title: "Poetry & Wine Evening",
    date: {
      day: "27",
      month: "Dec",
      full: "Friday, December 27, 2025",
      time: "7:00 PM - 10:00 PM (CAT)",
    },
    location: {
      name: "Book Café",
      address: "Harare, Zimbabwe",
    },
    category: "Culture",
    coverGradient: "linear-gradient(135deg, #4B0082, #7B1FA2)",
    attendeeCount: 28,
    description:
      "An intimate evening of spoken word, poetry readings, and fine wine. Share your work or simply enjoy the art.",
    host: {
      name: "Book Café",
      handle: "@bookcafeharare",
      initials: "BC",
      eventCount: 56,
    },
  },
  {
    id: "community-cleanup-borrowdale",
    title: "Community Clean-Up: Borrowdale",
    date: {
      day: "28",
      month: "Dec",
      full: "Saturday, December 28, 2025",
      time: "7:00 AM - 11:00 AM (CAT)",
    },
    location: {
      name: "Borrowdale Park",
      address: "Borrowdale, Harare",
    },
    category: "Community",
    coverGradient: "linear-gradient(135deg, #5D4037, #8D6E63)",
    attendeeCount: 67,
    friendsCount: 2,
    description:
      "Join your neighbors in keeping Borrowdale beautiful. Gloves and bags provided. Coffee and snacks after!",
    host: {
      name: "Borrowdale Residents",
      handle: "@borrowdalera",
      initials: "BR",
      eventCount: 6,
    },
  },
];

export function getEventById(id: string): Event | undefined {
  return events.find((e) => e.id === id);
}
