import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findEvent, getPlaceInfo } from "@/lib/api";
import { eventToJsonLd } from "@/lib/schema";
import { EventDetailContent } from "./event-detail-content";

// Force dynamic rendering — API must be live at request time
export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

// Dynamic OpenGraph metadata
export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await findEvent(id);

  if (!event) {
    return {
      title: "Event Not Found - nhimbe",
    };
  }

  const eventUrl = `https://nhimbe.com/events/${event._id}`;
  const shortUrl = `https://nhimbe.com/e/${event.shortCode}`;
  const place = getPlaceInfo(event);
  const description = `${event.name} on ${event.dateDisplay.full} at ${place.venue}, ${place.city}. ${event.description.slice(0, 150)}...`;

  // Generate dynamic OG image URL with mineral gradient
  const ogImageParams = new URLSearchParams({
    title: event.name,
    subtitle: `${event.dateDisplay.full} at ${place.venue}`,
    date: `${event.dateDisplay.day} ${event.dateDisplay.month}`,
    location: `${place.city}, ${place.country}`,
    category: event.category,
    gradient: "mixed",
    type: "event",
  });
  const ogImageUrl = `https://nhimbe.com/api/og?${ogImageParams.toString()}`;

  // Use cover image if available, otherwise use dynamic OG image
  const imageUrl = event.image || ogImageUrl;

  return {
    title: `${event.name} - nhimbe`,
    description,
    keywords: [
      event.category,
      ...event.keywords,
      place.city,
      place.country,
      "events",
      "nhimbe",
    ],
    openGraph: {
      title: event.name,
      description,
      type: "website",
      url: eventUrl,
      siteName: "nhimbe",
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: eventUrl,
    },
    other: {
      "short-url": shortUrl,
    },
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await findEvent(id);

  if (!event) {
    notFound();
  }

  const jsonLd = eventToJsonLd(event);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailContent event={event} />
    </>
  );
}
