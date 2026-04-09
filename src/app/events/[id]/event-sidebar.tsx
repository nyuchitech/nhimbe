"use client";

import { TrendingUp, Eye, Users, Star, Share2, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EventQRCode } from "./event-qr-code";
import { ShareButton } from "./event-actions";
import { RSVPButton } from "./rsvp-button";
import { HostReputation } from "@/components/ui/host-reputation";
import type { Event, EventStats, ReviewStats } from "@/lib/api";

interface EventSidebarProps {
  event: Event;
  stats: EventStats | null;
  reviewStats: ReviewStats | null;
}

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
      <div className="flex items-center gap-1.5 text-foreground/60 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

export function EventSidebar({ event, stats, reviewStats }: EventSidebarProps) {
  const capacityPercent = event.maximumAttendeeCapacity
    ? Math.min((event.attendeeCount / event.maximumAttendeeCapacity) * 100, 100)
    : 0;
  const spotsLeft = event.maximumAttendeeCapacity
    ? event.maximumAttendeeCapacity - event.attendeeCount
    : null;

  return (
    <aside data-slot="event-sidebar" className="lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top,0px))] self-start space-y-6">
      {/* Ticket Card */}
      <Card className="border-0" style={{ backgroundColor: "var(--event-surface)" }}>
        <CardContent className="p-6">
          <h3 className="text-sm text-foreground/60 mb-2">
            {event.offers?.price ? "Tickets" : "Free Event"}
          </h3>
          <div className="text-[32px] font-extrabold mb-5" style={{ color: "var(--event-primary)" }}>
            {event.offers?.price ? (
              <>
                ${event.offers.price}{" "}
                <span className="text-sm font-medium text-foreground/60">{event.offers.priceCurrency}</span>
              </>
            ) : (
              "Free"
            )}
          </div>
          <RSVPButton eventId={event.id} price={event.offers} />

          {event.maximumAttendeeCapacity && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--event-border)" }}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-foreground/60">Spots</span>
                <span className="font-medium">{event.attendeeCount} / {event.maximumAttendeeCapacity}</span>
              </div>
              <Progress value={capacityPercent} className="h-2" />
              {spotsLeft !== null && spotsLeft < event.maximumAttendeeCapacity * 0.2 && (
                <p className="text-xs text-red-400 mt-2">Only {spotsLeft} spots left!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Insights */}
      {(stats || reviewStats) && (
        <Card className="border-0" style={{ backgroundColor: "var(--event-surface)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm">
              <TrendingUp className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
              Event Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              {stats?.views !== undefined && (
                <StatBox icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={formatViews(stats.views)} />
              )}
              <StatBox icon={<Users className="w-3.5 h-3.5" />} label="Going" value={event.attendeeCount} />
              {reviewStats && reviewStats.totalReviews > 0 && (
                <StatBox icon={<Star className="w-3.5 h-3.5 text-accent" />} label="Rating" value={reviewStats.averageRating.toFixed(1)} />
              )}
              {stats?.referrals !== undefined && stats.referrals > 0 && (
                <StatBox icon={<Share2 className="w-3.5 h-3.5" />} label="Referrals" value={stats.referrals} />
              )}
            </div>
            <p className="text-xs text-foreground/40 text-center mt-3">Open data - Transparency builds trust</p>
          </CardContent>
        </Card>
      )}

      {/* QR Code */}
      <Card className="border-0" style={{ backgroundColor: "var(--event-surface)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <QrCode className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
            Share Event
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <EventQRCode shortCode={event.shortCode} title={event.name} />
          <div className="mt-4 flex gap-2">
            <ShareButton event={event} />
          </div>
        </CardContent>
      </Card>

      {/* Friends */}
      {event.friends && event.friends.length > 0 && (
        <Card className="border-0" style={{ backgroundColor: "var(--event-surface)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2.5 text-sm">
              <Users className="w-4.5 h-4.5" style={{ color: "var(--event-primary)" }} />
              {event.friends.length} friend{event.friends.length > 1 ? "s" : ""} going
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
          </CardContent>
        </Card>
      )}

      {/* Host Reputation */}
      <HostReputation
        host={{
          name: event.organizer.name,
          handle: event.organizer.identifier,
          initials: event.organizer.initials,
          eventsHosted: event.organizer.eventCount,
          rating: reviewStats?.averageRating,
          reviewCount: reviewStats?.totalReviews,
          badges: event.organizer.eventCount > 10 ? ["trusted-host", "veteran"] : event.organizer.eventCount > 5 ? ["trusted-host"] : ["rising-star"],
        }}
        variant="compact"
      />
    </aside>
  );
}
