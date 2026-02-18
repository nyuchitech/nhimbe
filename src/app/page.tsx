import { HomeClient } from "./home-client";
import type { Event, Category } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://events-api.mukoko.com";

async function fetchInitialEvents(): Promise<Event[]> {
  try {
    if (!API_URL) return [];
    const res = await fetch(`${API_URL}/api/events?limit=50`, {
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

export default async function DiscoverPage() {
  const [initialEvents, initialCategories] = await Promise.all([
    fetchInitialEvents(),
    fetchInitialCategories(),
  ]);

  return (
    <HomeClient
      initialEvents={initialEvents}
      initialCategories={initialCategories}
    />
  );
}
