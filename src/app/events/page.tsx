import type { Metadata } from "next";
import { EventsClient } from "./events-client";
import type { Event, Category } from "@/lib/api";

export const metadata: Metadata = {
  title: "Browse Events",
  description: "Discover community events near you — concerts, meetups, workshops, and more on nhimbe.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://events-api.mukoko.com";

async function fetchInitialEvents(): Promise<Event[]> {
  try {
    if (!API_URL) return [];
    const res = await fetch(`${API_URL}/api/events?limit=100`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

async function fetchInitialCategories(): Promise<Category[]> {
  try {
    if (!API_URL) return [];
    const res = await fetch(`${API_URL}/api/categories`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

async function fetchInitialCities(): Promise<{ addressLocality: string; addressCountry: string }[]> {
  try {
    if (!API_URL) return [];
    const res = await fetch(`${API_URL}/api/cities`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cities || [];
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const [initialEvents, initialCategories, initialCities] = await Promise.all([
    fetchInitialEvents(),
    fetchInitialCategories(),
    fetchInitialCities(),
  ]);

  return (
    <EventsClient
      initialEvents={initialEvents}
      initialCategories={initialCategories}
      initialCities={initialCities}
    />
  );
}
