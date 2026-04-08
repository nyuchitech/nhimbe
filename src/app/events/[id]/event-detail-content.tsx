"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin, Video, Bookmark, Globe, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Rating } from "@/components/ui/rating";
import { AddToCalendarButton, GetDirectionsButton } from "./event-actions";
import { EventThemeWrapper } from "./event-theme-wrapper";
import { EventMap } from "./event-map";
import { EventWeather } from "./event-weather";
import { EventCover } from "./event-cover";
import { EventSidebar } from "./event-sidebar";
import { RSVPButton } from "./rsvp-button";
import { useAuth } from "@/components/auth/auth-context";
import { getUserReferralCode, generateUserReferralCode, getEventStats, getEventReviews, type UserReferralCode, type EventStats, type ReviewStats } from "@/lib/api";
import type { Event } from "@/lib/api";

const EventRatings = dynamic(
  () => import("@/components/ui/event-ratings").then(m => ({ default: m.EventRatings })),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
);

const ReferralLeaderboard = dynamic(
  () => import("@/components/ui/referral-leaderboard").then(m => ({ default: m.ReferralLeaderboard })),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> }
);

interface EventDetailContentProps {
  event: Event;
}

export function EventDetailContent({ event }: EventDetailContentProps) {
  const { user } = useAuth();
  const [userReferral, setUserReferral] = useState<UserReferralCode | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const isPastEvent = new Date(event.startDate) < new Date();
  const isOnline = event.eventAttendanceMode === "OnlineEventAttendanceMode";
  const isInPerson = !isOnline && event.location.addressLocality !== "Online";

  useEffect(() => {
    const controller = new AbortController();
    getEventStats(event.id).then(data => {
      if (!controller.signal.aborted) setStats(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [event.id]);

  useEffect(() => {
    const controller = new AbortController();
    getEventReviews(event.id).then(r => {
      if (!controller.signal.aborted) setReviewStats(r.stats);
    }).catch(() => {});
    return () => controller.abort();
  }, [event.id]);

  useEffect(() => {
    async function fetchReferralCode() {
      if (!user?.id) return;
      try {
        let referral = await getUserReferralCode(user.id);
        if (!referral) {
          const result = await generateUserReferralCode(user.id);
          referral = { code: result.code, totalReferrals: 0, totalConversions: 0 };
        }
        setUserReferral(referral);
      } catch {}
    }
    fetchReferralCode();
  }, [user?.id]);

  return (
    <EventThemeWrapper coverGradient={event.coverGradient}>
      {/* Extra bottom padding on mobile for the sticky RSVP bar */}
      <div className="max-w-250 mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-4 sm:mb-6">
          <ArrowLeft className="w-4.5 h-4.5" />
          Back to events
        </Link>

        <EventCover event={event} stats={stats} reviewStats={reviewStats} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12">
          {/* Main Content */}
          <div>
            {/* Featured in badge - Luma style */}
            {event.location.addressLocality && event.location.addressLocality !== "Online" && (
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant="ghost"
                  className="text-xs font-medium border-0 px-0"
                  style={{ color: "var(--event-primary)" }}
                >
                  Featured in {event.location.addressLocality} <ChevronRight className="w-3 h-3 inline" />
                </Badge>
              </div>
            )}

            <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mb-2">{event.name}</h1>

            {/* Compact host link under title */}
            <Link href="#hosted-by" className="flex items-center gap-2 mb-5 sm:mb-6 group">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0A0A0A] shrink-0"
                style={{ background: `linear-gradient(135deg, var(--event-primary), var(--event-secondary))` }}
              >
                {event.organizer.initials}
              </div>
              <span className="text-sm text-foreground/60 group-hover:text-foreground transition-colors">
                {event.organizer.name} <ChevronRight className="w-3 h-3 inline" />
              </span>
            </Link>

            {/* Date Row - Luma calendar block style */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border" style={{ borderColor: "var(--event-surface)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50 leading-none">
                  {event.date.month.slice(0, 3)}
                </div>
                <div className="text-xl font-bold leading-none mt-0.5" style={{ color: "var(--event-primary)" }}>
                  {event.date.day}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold">{event.date.full}</h4>
                <p className="text-sm text-foreground/60">{event.date.time}</p>
              </div>
              <AddToCalendarButton event={event} />
            </div>

            {/* Location Row - Luma style with pin */}
            <div className="flex items-center gap-4 mb-6 sm:mb-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--event-surface)", color: "var(--event-primary)" }}>
                {isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{event.location.name}</h4>
                {isOnline && event.meetingPlatform ? (
                  <p className="text-sm text-foreground/60">
                    {event.meetingPlatform === "zoom" && "Zoom Meeting"}
                    {event.meetingPlatform === "google_meet" && "Google Meet"}
                    {event.meetingPlatform === "teams" && "Microsoft Teams"}
                    {event.meetingPlatform === "other" && "Online Meeting"}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60 truncate">
                    {event.location.addressLocality}, {event.location.addressCountry}
                  </p>
                )}
              </div>
              {isOnline && event.meetingUrl ? (
                <Button variant="secondary" size="sm" onClick={() => window.open(event.meetingUrl, "_blank")}>Join</Button>
              ) : (
                <GetDirectionsButton event={event} />
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-bold mb-4">About This Event</h3>
              {event.description.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-foreground/60 mb-4">{paragraph}</p>
              ))}
            </div>

            {/* Location Section - Luma style: heading, venue, address, map */}
            {isInPerson && (
              <div className="mt-8">
                <Separator className="mb-8" style={{ backgroundColor: "var(--event-surface)" }} />
                <h3 className="text-sm font-medium text-foreground/50 mb-4">Location</h3>
                <h4 className="text-lg font-bold mb-1">{event.location.name}</h4>
                {event.location.streetAddress && (
                  <p className="text-sm text-foreground/60 mb-1">{event.location.streetAddress}</p>
                )}
                <p className="text-sm text-foreground/60 mb-5">
                  {event.location.addressLocality}, {event.location.addressCountry}
                </p>
                <EventMap
                  venue={event.location.name}
                  address={event.location.streetAddress || ""}
                  city={event.location.addressLocality}
                  country={event.location.addressCountry}
                />
              </div>
            )}

            {/* Weather for in-person events */}
            {isInPerson && (
              <div className="mt-6">
                <EventWeather city={event.location.addressLocality} eventDate={event.startDate} />
              </div>
            )}

            {/* Hosted By Section - Luma style */}
            <div id="hosted-by" className="mt-10 scroll-mt-20">
              <Separator className="mb-8" style={{ backgroundColor: "var(--event-surface)" }} />
              <h3 className="text-sm font-medium text-foreground/50 mb-4">Hosted By</h3>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-[#0A0A0A] shrink-0"
                  style={{ background: `linear-gradient(135deg, var(--event-primary), var(--event-secondary))` }}
                >
                  {event.organizer.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold">{event.organizer.name}</h4>
                    <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4 shrink-0">
                      Subscribe
                    </Button>
                  </div>
                  {event.organizer.identifier && (
                    <p className="text-sm text-foreground/60 mb-2">{event.organizer.identifier}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-foreground/60 mb-3">
                    <span>{event.organizer.eventCount} events hosted</span>
                    {event.organizer.eventCount > 5 && (
                      <Badge variant="success" className="text-[10px]">Trusted Host</Badge>
                    )}
                    {reviewStats && reviewStats.averageRating > 0 && (
                      <>
                        <span>·</span>
                        <Rating value={reviewStats.averageRating} readOnly size="sm" showValue />
                      </>
                    )}
                  </div>
                  {/* Social links */}
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-4 h-4 text-foreground/40" />
                  </div>
                  <button className="text-sm font-medium" style={{ color: "var(--event-primary)" }}>
                    Contact the Host
                  </button>
                </div>
              </div>
            </div>

            {/* Ratings */}
            {isPastEvent && (
              <div className="mt-10">
                <Separator className="mb-8" style={{ backgroundColor: "var(--event-surface)" }} />
                <EventRatings eventId={event.id} isPastEvent={true} userCanReview={true} />
              </div>
            )}

            {/* Referral Leaderboard */}
            <div className="mt-10">
              <Separator className="mb-8" style={{ backgroundColor: "var(--event-surface)" }} />
              <ReferralLeaderboard
                eventId={event.id}
                userReferralCode={userReferral?.code}
                userReferrals={userReferral?.totalReferrals || 0}
              />
            </div>
          </div>

          <EventSidebar event={event} stats={stats} reviewStats={reviewStats} />
        </div>
      </div>

      {/* Sticky Mobile RSVP + Bookmark Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-background/90 backdrop-blur-xl border-t border-elevated z-40 lg:hidden">
        <div className="max-w-250 mx-auto flex items-center gap-2.5">
          {/* Bookmark / Interested button */}
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              bookmarked
                ? "border-transparent"
                : "border-elevated hover:bg-elevated"
            }`}
            style={bookmarked ? { backgroundColor: "var(--event-surface)", color: "var(--event-primary)" } : undefined}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark event"}
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? "fill-current" : ""}`} />
          </button>
          {/* Price + RSVP */}
          <div className="flex-1 min-w-0">
            <RSVPButton eventId={event.id} price={event.offers} />
          </div>
        </div>
      </div>
    </EventThemeWrapper>
  );
}
