import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { findEvent, getPlaceInfo } from "@/lib/api";

// Force dynamic rendering — API must be live at request time
export const dynamic = "force-dynamic";

interface ShortCodePageProps {
  params: Promise<{ shortCode: string }>;
}

// Dynamic metadata for short URL sharing
export async function generateMetadata({ params }: ShortCodePageProps): Promise<Metadata> {
  const { shortCode } = await params;
  const event = await findEvent(shortCode);

  if (!event) {
    return {
      title: "Event Not Found - nhimbe",
    };
  }

  const place = getPlaceInfo(event);
  const eventUrl = `https://nhimbe.com/events/${event._id}`;
  const description = `${event.name} on ${event.dateDisplay.full} at ${place.venue}, ${place.city}`;

  return {
    title: `${event.name} - nhimbe`,
    description,
    openGraph: {
      title: event.name,
      description,
      type: "website",
      url: eventUrl,
      siteName: "nhimbe",
      images: event.image
        ? [{ url: event.image, width: 1200, height: 630, alt: event.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description,
      images: event.image ? [event.image] : undefined,
    },
  };
}

export default async function ShortCodePage({ params }: ShortCodePageProps) {
  const { shortCode } = await params;
  const event = await findEvent(shortCode);

  if (!event) {
    notFound();
  }

  // Redirect to the full event page
  redirect(`/events/${event._id}`);
}
