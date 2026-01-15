"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarDays, MapPin, Users, QrCode, Video, Eye, TrendingUp, Flame, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventQRCode } from "./event-qr-code";
import { AddToCalendarButton, GetDirectionsButton, ShareButton } from "./event-actions";
import { RSVPButton } from "./rsvp-button";
import { EventThemeWrapper } from "./event-theme-wrapper";
import { EventMap } from "./event-map";
import { EventWeather } from "./event-weather";
import { HostReputation } from "@/components/ui/host-reputation";
import { EventRatings } from "@/components/ui/event-ratings";
import { ReferralLeaderboard } from "@/components/ui/referral-leaderboard";
import { PopularityBadge } from "@/components/ui/popularity-badge";
import type { Event } from "@/lib/api";

interface EventDetailContentProps {
  event: Event;
}

// Simulated data - in production this would come from API
const getEventInsights = (event: Event) => {
  // Generate consistent "random" data based on event id
  const seed = event.id.charCodeAt(0) + event.id.charCodeAt(1);
  return {
    views: 120 + (seed * 47) % 2000,
    trend: (seed * 13) % 35,
    isHot: seed % 4 === 0,
    rating: 3.5 + ((seed * 7) % 15) / 10,
    reviewCount: 5 + (seed * 3) % 95,
    isPastEvent: new Date(event.date.iso) < new Date(),
  };
};

export function EventDetailContent({ event }: EventDetailContentProps) {
  const insights = getEventInsights(event);

  const coverStyle = event.coverImage
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('${event.coverImage}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: event.coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

  const formatViews = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <EventThemeWrapper coverGradient={event.coverGradient}>
      <div className="max-w-250 mx-auto px-6 py-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
          Back to events
        </Link>

        {/* Cover Image */}
        <div
          className="h-100 rounded-(--radius-card) relative mb-8 overflow-hidden"
          style={coverStyle}
        >
          {event.coverImage && (
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

          <div className="absolute top-6 left-6 flex gap-3 z-10">
            {/* Date Badge */}
            <div className="bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center">
              <div className="text-2xl font-extrabold text-white leading-none" style={{ color: "var(--event-primary)" }}>
                {event.date.day}
              </div>
              <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
                {event.date.month}
              </div>
            </div>

            {/* Category Badge */}
            <div
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase self-start"
              style={{ backgroundColor: "var(--event-primary)", color: "#0A0A0A" }}
            >
              {event.category}
            </div>

            {/* Hot/Trending Badge */}
            {insights.isHot && (
              <div className="flex items-center gap-1 bg-accent/90 text-background px-2.5 py-1.5 rounded-full self-start">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">HOT</span>
              </div>
            )}
            {!insights.isHot && insights.trend > 20 && (
              <div className="flex items-center gap-1 bg-green-500/90 text-white px-2.5 py-1.5 rounded-full self-start">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">+{insights.trend}%</span>
              </div>
            )}
          </div>

          {/* Open Data: Views & Rating on Cover */}
          <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">{formatViews(insights.views)} views</span>
            </div>
            {insights.rating > 0 && insights.reviewCount > 0 && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="text-sm font-medium">{insights.rating.toFixed(1)}</span>
                <span className="text-xs text-white/60">({insights.reviewCount})</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="absolute bottom-6 left-6 flex gap-2 flex-wrap max-w-[80%] z-10">
              {event.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="bg-black/50 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full text-[11px]"
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

            {/* Host Row with Reputation */}
            <div className="flex items-center gap-3.5 py-4 border-b mb-6" style={{ borderColor: "var(--event-surface)" }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[#0A0A0A]"
                style={{ background: `linear-gradient(135deg, var(--event-primary), var(--event-secondary))` }}
              >
                {event.host.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{event.host.name}</h4>
                  {event.host.eventCount > 5 && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                      Trusted Host
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <span>{event.host.handle}</span>
                  <span>·</span>
                  <span>{event.host.eventCount} events hosted</span>
                  {insights.rating > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <span>{insights.rating.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button variant="secondary">Follow</Button>
            </div>

            {/* Date Row */}
            <div className="flex items-start gap-4 py-4 border-b" style={{ borderColor: "var(--event-surface)" }}>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--event-surface)", color: "var(--event-primary)" }}
              >
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.date.full}</h4>
                <p className="text-sm text-foreground/60">{event.date.time}</p>
              </div>
              <AddToCalendarButton event={event} />
            </div>

            {/* Location Row */}
            <div className="flex items-start gap-4 py-4 border-b" style={{ borderColor: "var(--event-surface)" }}>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--event-surface)", color: "var(--event-primary)" }}
              >
                {event.isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.location.venue}</h4>
                {event.isOnline && event.meetingPlatform ? (
                  <p className="text-sm text-foreground/60">
                    {event.meetingPlatform === "zoom" && "Zoom Meeting"}
                    {event.meetingPlatform === "google_meet" && "Google Meet"}
                    {event.meetingPlatform === "teams" && "Microsoft Teams"}
                    {event.meetingPlatform === "other" && "Online Meeting"}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60">
                    {event.location.address && `${event.location.address}, `}{event.location.city}, {event.location.country}
                  </p>
                )}
              </div>
              {event.isOnline && event.meetingUrl ? (
                <Button
                  variant="secondary"
                  onClick={() => window.open(event.meetingUrl, "_blank")}
                >
                  Join
                </Button>
              ) : (
                <GetDirectionsButton event={event} />
              )}
            </div>

            {/* Google Map - only for in-person events */}
            {!event.isOnline && event.location.city !== "Online" && (
              <div className="mt-6 mb-6">
                <EventMap
                  venue={event.location.venue}
                  address={event.location.address}
                  city={event.location.city}
                  country={event.location.country}
                />
              </div>
            )}

            {/* Weather - only for in-person events */}
            {!event.isOnline && event.location.city !== "Online" && (
              <div className="mb-8">
                <EventWeather city={event.location.city} eventDate={event.date.iso} />
              </div>
            )}

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

            {/* Event Ratings - Public Feedback */}
            {insights.isPastEvent && (
              <div className="mt-8">
                <EventRatings
                  eventId={event.id}
                  isPastEvent={true}
                  userCanReview={true}
                />
              </div>
            )}

            {/* Referral Leaderboard - Community Builders */}
            <div className="mt-8">
              <ReferralLeaderboard
                eventId={event.id}
                userReferralCode="user123"
                userReferrals={0}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-25 self-start space-y-6">
            {/* Ticket Card */}
            <div
              className="rounded-(--radius-card) p-6"
              style={{ backgroundColor: "var(--event-surface)" }}
            >
              <h3 className="text-sm text-foreground/60 mb-2">
                {event.price?.label || "Free Event"}
              </h3>
              <div className="text-[32px] font-extrabold mb-5" style={{ color: "var(--event-primary)" }}>
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

              {/* Capacity indicator */}
              {event.capacity && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--event-border)" }}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground/60">Spots</span>
                    <span className="font-medium">
                      {event.attendeeCount} / {event.capacity}
                    </span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((event.attendeeCount / event.capacity) * 100, 100)}%`,
                        backgroundColor: "var(--event-primary)",
                      }}
                    />
                  </div>
                  {event.capacity - event.attendeeCount < event.capacity * 0.2 && (
                    <p className="text-xs text-red-400 mt-2">
                      Only {event.capacity - event.attendeeCount} spots left!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Event Stats Card - Open Data */}
            <div
              className="rounded-(--radius-card) p-5"
              style={{ backgroundColor: "var(--event-surface)" }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
                <h4 className="font-semibold text-sm">Event Insights</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                  <div className="flex items-center gap-1.5 text-foreground/60 mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs">Views</span>
                  </div>
                  <div className="text-lg font-bold">{formatViews(insights.views)}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                  <div className="flex items-center gap-1.5 text-foreground/60 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs">Going</span>
                  </div>
                  <div className="text-lg font-bold">{event.attendeeCount}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                  <div className="flex items-center gap-1.5 text-foreground/60 mb-1">
                    <Star className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs">Rating</span>
                  </div>
                  <div className="text-lg font-bold">{insights.rating.toFixed(1)}</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                  <div className="flex items-center gap-1.5 text-foreground/60 mb-1">
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Referrals</span>
                  </div>
                  <div className="text-lg font-bold">33</div>
                </div>
              </div>
              <p className="text-xs text-foreground/40 text-center mt-3">
                Open data - Transparency builds trust
              </p>
            </div>

            {/* QR Code Card */}
            <div
              className="rounded-(--radius-card) p-5"
              style={{ backgroundColor: "var(--event-surface)" }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <QrCode className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
                <h4 className="font-semibold text-sm">Share Event</h4>
              </div>
              <EventQRCode shortCode={event.shortCode} title={event.title} />
              <div className="mt-4 flex gap-2">
                <ShareButton event={event} />
              </div>
            </div>

            {/* Friends Card */}
            {event.friends && event.friends.length > 0 && (
              <div
                className="rounded-(--radius-card) p-5"
                style={{ backgroundColor: "var(--event-surface)" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <Users className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
                  <h4 className="font-semibold text-sm">
                    {event.friends.length} friend{event.friends.length > 1 ? "s" : ""} going
                  </h4>
                </div>
                <div className="flex gap-4">
                  {event.friends.map((friend, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="w-13 h-[52px] rounded-full border-2"
                        style={{
                          background: `linear-gradient(135deg, var(--event-primary), var(--event-secondary))`,
                          borderColor: "var(--event-primary)",
                        }}
                      />
                      <span className="text-xs text-foreground/60">{friend.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host Reputation Card */}
            <HostReputation
              host={{
                name: event.host.name,
                handle: event.host.handle,
                initials: event.host.initials,
                eventsHosted: event.host.eventCount,
                totalAttendees: event.host.eventCount * 25,
                avgAttendance: 78,
                rating: insights.rating,
                reviewCount: insights.reviewCount,
                badges: event.host.eventCount > 10 ? ["trusted-host", "veteran"] : event.host.eventCount > 5 ? ["trusted-host"] : ["rising-star"],
              }}
              variant="compact"
            />
          </aside>
        </div>
      </div>
    </EventThemeWrapper>
  );
}
