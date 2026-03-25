"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarDays, MapPin, Video, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AddToCalendarButton, GetDirectionsButton } from "./event-actions";
import { EventThemeWrapper } from "./event-theme-wrapper";
import { EventMap } from "./event-map";
import { EventWeather } from "./event-weather";
import { EventCover } from "./event-cover";
import { EventSidebar } from "./event-sidebar";
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
  const isPastEvent = new Date(event.startDate) < new Date();
  const isOnline = event.eventAttendanceMode === "OnlineEventAttendanceMode";
  const isInPerson = !isOnline && event.location.addressLocality !== "Online";

  useEffect(() => {
    getEventStats(event.id).then(setStats).catch(() => {});
  }, [event.id]);

  useEffect(() => {
    getEventReviews(event.id).then(r => setReviewStats(r.stats)).catch(() => {});
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
      <div className="max-w-250 mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-6">
          <ArrowLeft className="w-4.5 h-4.5" />
          Back to events
        </Link>

        <EventCover event={event} stats={stats} reviewStats={reviewStats} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
          {/* Main Content */}
          <div>
            <h1 className="font-serif text-4xl font-bold leading-tight mb-6">{event.name}</h1>

            {/* Host Row */}
            <div className="flex items-center gap-3.5 py-4" style={{ borderColor: "var(--event-surface)" }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[#0A0A0A]"
                style={{ background: `linear-gradient(135deg, var(--event-primary), var(--event-secondary))` }}
              >
                {event.organizer.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{event.organizer.name}</h4>
                  {event.organizer.eventCount > 5 && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full">
                      Trusted Host
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <span>{event.organizer.identifier}</span>
                  <span>·</span>
                  <span>{event.organizer.eventCount} events hosted</span>
                  {reviewStats && reviewStats.averageRating > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <span>{reviewStats.averageRating.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button variant="secondary">Follow</Button>
            </div>

            <Separator style={{ backgroundColor: "var(--event-surface)" }} />

            {/* Date Row */}
            <div className="flex items-start gap-4 py-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--event-surface)", color: "var(--event-primary)" }}>
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.date.full}</h4>
                <p className="text-sm text-foreground/60">{event.date.time}</p>
              </div>
              <AddToCalendarButton event={event} />
            </div>

            <Separator style={{ backgroundColor: "var(--event-surface)" }} />

            {/* Location Row */}
            <div className="flex items-start gap-4 py-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--event-surface)", color: "var(--event-primary)" }}>
                {isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{event.location.name}</h4>
                {isOnline && event.meetingPlatform ? (
                  <p className="text-sm text-foreground/60">
                    {event.meetingPlatform === "zoom" && "Zoom Meeting"}
                    {event.meetingPlatform === "google_meet" && "Google Meet"}
                    {event.meetingPlatform === "teams" && "Microsoft Teams"}
                    {event.meetingPlatform === "other" && "Online Meeting"}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60">
                    {event.location.streetAddress && `${event.location.streetAddress}, `}{event.location.addressLocality}, {event.location.addressCountry}
                  </p>
                )}
              </div>
              {isOnline && event.meetingUrl ? (
                <Button variant="secondary" onClick={() => window.open(event.meetingUrl, "_blank")}>Join</Button>
              ) : (
                <GetDirectionsButton event={event} />
              )}
            </div>

            {/* Map & Weather */}
            {isInPerson && (
              <>
                <div className="mt-6 mb-6">
                  <EventMap venue={event.location.name} address={event.location.streetAddress || ""} city={event.location.addressLocality} country={event.location.addressCountry} />
                </div>
                <div className="mb-8">
                  <EventWeather city={event.location.addressLocality} eventDate={event.startDate} />
                </div>
              </>
            )}

            {/* Description */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">About This Event</h3>
              {event.description.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-foreground/60 mb-4">{paragraph}</p>
              ))}
            </div>

            {/* Ratings */}
            {isPastEvent && (
              <div className="mt-8">
                <EventRatings eventId={event.id} isPastEvent={true} userCanReview={true} />
              </div>
            )}

            {/* Referral Leaderboard */}
            <div className="mt-8">
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
    </EventThemeWrapper>
  );
}
