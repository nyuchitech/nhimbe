import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findEvent, getEvents } from "@/lib/api";
import { EventDetailContent } from "./event-detail-content";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for all events (fetched at build time)
export async function generateStaticParams() {
  try {
    const response = await getEvents({ limit: 100 });
    return response.events.map((event) => ({
      id: event.id,
    }));
  } catch {
    return [];
  }
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

  const eventUrl = `https://www.nhimbe.com/events/${event.id}`;
  const shortUrl = `https://www.nhimbe.com/e/${event.shortCode}`;
  const description = `${event.title} on ${event.date.full} at ${event.location.venue}, ${event.location.city}. ${event.description.slice(0, 150)}...`;

  // Generate dynamic OG image URL with mineral gradient
  const ogImageParams = new URLSearchParams({
    title: event.title,
    subtitle: `${event.date.full} at ${event.location.venue}`,
    date: `${event.date.day} ${event.date.month}`,
    location: `${event.location.city}, ${event.location.country}`,
    category: event.category,
    gradient: "mixed",
    type: "event",
  });
  const ogImageUrl = `https://www.nhimbe.com/api/og?${ogImageParams.toString()}`;

  // Use cover image if available, otherwise use dynamic OG image
  const imageUrl = event.coverImage || ogImageUrl;

  return {
    title: `${event.title} - nhimbe`,
    description,
    keywords: [
      event.category,
      ...event.tags,
      event.location.city,
      event.location.country,
      "events",
      "nhimbe",
    ],
    openGraph: {
      title: event.title,
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
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
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

  const eventUrl = `https://www.nhimbe.com/e/${event.shortCode}`;

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date.iso,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.isOnline
      ? {
          "@type": "VirtualLocation",
          url: eventUrl,
        }
      : {
          "@type": "Place",
          name: event.location.venue,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.location.address,
            addressLocality: event.location.city,
            addressCountry: event.location.country,
          },
        },
    organizer: {
      "@type": "Organization",
      name: event.host.name,
      url: `https://nhimbe.com/${event.host.handle.replace("@", "")}`,
    },
    offers: event.price
      ? {
          "@type": "Offer",
          price: event.price.amount,
          priceCurrency: event.price.currency,
          availability: "https://schema.org/InStock",
          url: eventUrl,
        }
      : {
          "@type": "Offer",
          price: 0,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: eventUrl,
        },
    image: event.coverImage,
    maximumAttendeeCapacity: event.capacity,
  };

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
