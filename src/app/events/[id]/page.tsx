import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin, Users, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findEvent, getEvents } from "@/lib/api";
import { EventQRCode } from "./event-qr-code";
import { AddToCalendarButton, GetDirectionsButton, ShareButton } from "./event-actions";
import { RSVPButton } from "./rsvp-button";

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

  const eventUrl = `https://nhimbe.com/events/${event.id}`;
  const shortUrl = `https://nhimbe.com/e/${event.shortCode}`;
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
  const ogImageUrl = `https://nhimbe.com/api/og?${ogImageParams.toString()}`;

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

  const eventUrl = `https://nhimbe.com/e/${event.shortCode}`;

  const coverStyle = event.coverImage
    ? {
        background: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('${event.coverImage}') center/cover`,
      }
    : { background: event.coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

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

      <div className="max-w-[1000px] mx-auto px-6 py-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
          Back to events
        </Link>

        {/* Cover Image */}
        <div
          className="h-[400px] rounded-[var(--radius-card)] relative mb-8"
          style={coverStyle}
        >
          <div className="absolute top-6 left-6 flex gap-3">
            {/* Date Badge */}
            <div className="bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-primary leading-none">
                {event.date.day}
              </div>
              <div className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
                {event.date.month}
              </div>
            </div>

            {/* Category Badge */}
            <div className="bg-secondary text-background px-3 py-1.5 rounded-full text-[11px] font-bold uppercase self-start">
              {event.category}
            </div>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="absolute bottom-6 left-6 flex gap-2 flex-wrap max-w-[80%]">
              {event.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="bg-black/50 backdrop-blur-sm text-foreground/80 px-2.5 py-1 rounded-full text-[11px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Main Content */}
          <div>
            <h1 className="font-serif text-4xl font-bold leading-tight mb-6">
              {event.title}
            </h1>

            {/* Host Row */}
            <div className="flex items-center gap-3.5 py-4 border-b border-elevated mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center font-bold text-background">
                {event.host.initials}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.host.name}</h4>
                <p className="text-sm text-foreground/60">
                  {event.host.handle} · {event.host.eventCount} past events
                </p>
              </div>
              <Button variant="secondary">Follow</Button>
            </div>

            {/* Date Row */}
            <div className="flex items-start gap-4 py-4 border-b border-elevated">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-primary shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.date.full}</h4>
                <p className="text-sm text-foreground/60">{event.date.time}</p>
              </div>
              <AddToCalendarButton event={event} />
            </div>

            {/* Location Row */}
            <div className="flex items-start gap-4 py-4 border-b border-elevated">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.location.venue}</h4>
                <p className="text-sm text-foreground/60">
                  {event.location.address}, {event.location.city}, {event.location.country}
                </p>
              </div>
              <GetDirectionsButton event={event} />
            </div>

            {/* Description */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">About This Event</h3>
              {event.description.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[15px] leading-relaxed text-foreground/60 mb-4"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-[100px] self-start space-y-6">
            {/* Ticket Card */}
            <div className="bg-surface rounded-[var(--radius-card)] p-6">
              <h3 className="text-sm text-foreground/60 mb-2">
                {event.price?.label || "Free Event"}
              </h3>
              <div className="text-[32px] font-extrabold text-primary mb-5">
                {event.price ? (
                  <>
                    ${event.price.amount}{" "}
                    <span className="text-sm font-medium text-foreground/60">
                      {event.price.currency}
                    </span>
                  </>
                ) : (
                  "Free"
                )}
              </div>
              <RSVPButton eventId={event.id} price={event.price} />
            </div>

            {/* QR Code Card */}
            <div className="bg-surface rounded-[var(--radius-card)] p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <QrCode className="w-[18px] h-[18px] text-primary" />
                <h4 className="font-semibold text-sm">Share Event</h4>
              </div>
              <EventQRCode shortCode={event.shortCode} title={event.title} />
              <div className="mt-4 flex gap-2">
                <ShareButton event={event} />
              </div>
            </div>

            {/* Friends Card */}
            {event.friends && event.friends.length > 0 && (
              <div className="bg-surface rounded-[var(--radius-card)] p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <Users className="w-[18px] h-[18px] text-primary" />
                  <h4 className="font-semibold text-sm">
                    {event.friends.length} friend{event.friends.length > 1 ? "s" : ""} going
                  </h4>
                </div>
                <div className="flex gap-4">
                  {event.friends.map((friend, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${friend.gradient} border-2 border-primary`}
                      />
                      <span className="text-xs text-foreground/60">{friend.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
