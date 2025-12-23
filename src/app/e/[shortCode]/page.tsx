import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventByShortCode, events } from "@/lib/data";

interface ShortCodePageProps {
  params: Promise<{ shortCode: string }>;
}

// Generate static params for all short codes
export async function generateStaticParams() {
  return events.map((event) => ({
    shortCode: event.shortCode,
  }));
}

// Dynamic metadata for short URL sharing
export async function generateMetadata({ params }: ShortCodePageProps): Promise<Metadata> {
  const { shortCode } = await params;
  const event = getEventByShortCode(shortCode);

  if (!event) {
    return {
      title: "Event Not Found - nhimbe",
    };
  }

  const eventUrl = `https://nhimbe.com/events/${event.id}`;
  const description = `${event.title} on ${event.date.full} at ${event.location.venue}, ${event.location.city}`;

  return {
    title: `${event.title} - nhimbe`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      url: eventUrl,
      siteName: "nhimbe",
      images: event.coverImage
        ? [{ url: event.coverImage, width: 1200, height: 630, alt: event.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.coverImage ? [event.coverImage] : undefined,
    },
  };
}

export default async function ShortCodePage({ params }: ShortCodePageProps) {
  const { shortCode } = await params;
  const event = getEventByShortCode(shortCode);

  if (!event) {
    notFound();
  }

  // Redirect to the full event page
  redirect(`/events/${event.id}`);
}
