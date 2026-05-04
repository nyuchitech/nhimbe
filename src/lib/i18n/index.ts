/**
 * Lightweight i18n for nhimbe.
 * Supports English (en) and Shona (sn) — the two primary languages in Zimbabwe.
 */

export type Locale = "en" | "sn";

type TranslationKey = string;
type TranslationMap = Record<TranslationKey, string>;

const translations: Record<Locale, TranslationMap> = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.events": "Events",
    "nav.search": "Search",
    "nav.myEvents": "My Events",
    "nav.profile": "Profile",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",

    // Events
    "events.create": "Create Event",
    "events.register": "Register",
    "events.registered": "Registered",
    "events.cancelled": "Cancelled",
    "events.full": "Event Full",
    "events.joinWaitlist": "Join Waitlist",
    "events.share": "Share",
    "events.attendees": "attendees",
    "events.noEvents": "No events found",
    "events.trending": "Trending",
    "events.upcoming": "Upcoming Events",

    // Auth
    "auth.signIn": "Sign In",
    "auth.signOut": "Sign Out",
    "auth.welcome": "Welcome back",

    // Common
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.retry": "Try again",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.copied": "Copied!",
    "common.seeAll": "See All",

    // Brand
    "brand.tagline": "Together we gather, together we grow.",

    // Kraal (formerly known as circles)
    "kraal.title": "Kraal",
    "kraal.subtitle": "Where the gathering circle keeps the fire alive between events.",
    "kraal.viewKraal": "View kraal",
    "kraal.join": "Join kraal",
    "kraal.tabs.stream": "Stream",
    "kraal.tabs.members": "Members",
    "kraal.tabs.archive": "Archive",
    "kraal.compose.placeholder": "Share something with the kraal…",
    "kraal.empty": "No posts yet — be the first to spark the fire.",
  },
  sn: {
    // Navigation
    "nav.home": "Kumba",
    "nav.events": "Zviitiko",
    "nav.search": "Tsvaga",
    "nav.myEvents": "Zviitiko Zvangu",
    "nav.profile": "Pfupiso",
    "nav.signIn": "Pinda",
    "nav.signOut": "Buda",

    // Events
    "events.create": "Gadzira Chiitiko",
    "events.register": "Nyoresa",
    "events.registered": "Wanyoreswa",
    "events.cancelled": "Yakadzimwa",
    "events.full": "Chiitiko Chakazara",
    "events.joinWaitlist": "Pinda muRaini",
    "events.share": "Govera",
    "events.attendees": "vanopinda",
    "events.noEvents": "Hapana zviitiko zvawanikwa",
    "events.trending": "Zvinonyanya Kutaurwa",
    "events.upcoming": "Zviitiko Zvinouya",

    // Auth
    "auth.signIn": "Pinda",
    "auth.signOut": "Buda",
    "auth.welcome": "Mauya zvakare",

    // Common
    "common.loading": "Kuvhura...",
    "common.error": "Pane chakakanganisika",
    "common.retry": "Edza zvakare",
    "common.save": "Chengetedza",
    "common.cancel": "Kanzura",
    "common.delete": "Bvisa",
    "common.edit": "Shandura",
    "common.copied": "Yakopiswa!",
    "common.seeAll": "Ona Zvose",

    // Brand
    "brand.tagline": "Tose tinosangana, tose tinokura.",

    // Kraal
    "kraal.title": "Kraal",
    "kraal.subtitle": "Pekuchengetedza moto wedanho pakati pezviitiko.",
    "kraal.viewKraal": "Ona Kraal",
    "kraal.join": "Pinda muKraal",
    "kraal.tabs.stream": "Mhepo",
    "kraal.tabs.members": "Vagari",
    "kraal.tabs.archive": "Zvakachengetwa",
    "kraal.compose.placeholder": "Govera neKraal…",
    "kraal.empty": "Hapana zvakanyorwa — iva wekutanga kubatidza moto.",
  },
};

let currentLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("nhimbe_locale", locale);
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("nhimbe_locale");
    if (stored === "en" || stored === "sn") {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

export function t(key: TranslationKey): string {
  return translations[currentLocale]?.[key] || translations.en[key] || key;
}

export function getAvailableLocales(): { code: Locale; name: string }[] {
  return [
    { code: "en", name: "English" },
    { code: "sn", name: "Shona" },
  ];
}
