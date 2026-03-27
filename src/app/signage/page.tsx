"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Calendar, MapPin, Users, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getEvents,
  getCommunityStats,
  type Event,
  type CommunityStats,
} from "@/lib/api";

type Orientation = "horizontal" | "vertical";

// ─── useOrientation ──────────────────────────────────────────────────────────
function useOrientation(): { orientation: Orientation; setOrientation: (o: Orientation) => void } {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window === "undefined") return "horizontal";
    return window.innerHeight > window.innerWidth ? "vertical" : "horizontal";
  });
  return { orientation, setOrientation };
}

// ─── Orientation Toggle ──────────────────────────────────────────────────────
function OrientationToggle({
  orientation,
  onChange,
}: {
  orientation: Orientation;
  onChange: (o: Orientation) => void;
}) {
  return (
    <button
      onClick={() => onChange(orientation === "horizontal" ? "vertical" : "horizontal")}
      className="fixed top-4 right-4 z-40 bg-black/40 hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
      title={`Switch to ${orientation === "horizontal" ? "vertical" : "horizontal"} layout`}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 4v6h6M23 20v-6h-6" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
      </svg>
    </button>
  );
}

// ─── Event Card for Signage ──────────────────────────────────────────────────
function SignageEventCard({ event, size }: { event: Event; size: "large" | "medium" | "compact" }) {
  const bgStyle = event.image
    ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%), url(${event.image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : event.coverGradient
      ? { background: event.coverGradient }
      : { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" };

  if (size === "compact") {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4" style={!event.image ? {} : undefined}>
        <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={bgStyle}>
          {!event.image && <Calendar className="w-6 h-6 text-white/60" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{event.name}</h3>
          <p className="text-sm text-white/50 truncate">{event.date.full} &middot; {event.location.addressLocality}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-primary">{event.attendeeCount}</div>
          <div className="text-xs text-white/40">going</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${size === "large" ? "min-h-[280px]" : "min-h-[200px]"} flex flex-col justify-end p-6`}
      style={bgStyle}
    >
      <div className="relative z-10">
        <Badge variant="secondary" className="mb-3 bg-white/20 text-white border-none">
          {event.category}
        </Badge>
        <h3 className={`${size === "large" ? "text-3xl" : "text-xl"} font-bold text-white leading-tight mb-2`}>
          {event.name}
        </h3>
        <div className="flex items-center gap-4 text-white/70 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {event.date.full}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.location.addressLocality}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {event.attendeeCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Stats Bar ──────────────────────────────────────────────────────
function PlatformStatsBar({ stats }: { stats: CommunityStats }) {
  return (
    <div className="flex items-center gap-8 text-white/70">
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{stats.totalEvents}</div>
        <div className="text-xs text-white/40">Events</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{stats.totalAttendees}</div>
        <div className="text-xs text-white/40">Attendees</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{stats.activeHosts}</div>
        <div className="text-xs text-white/40">Hosts</div>
      </div>
      {stats.trendingCategories.length > 0 && (
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/40">Trending:</span>
          {stats.trendingCategories.slice(0, 3).map((cat) => (
            <Badge key={cat.category} variant="secondary" className="bg-white/10 text-white/80 border-none text-xs">
              {cat.category}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Auto-rotating Featured Event ────────────────────────────────────────────
function FeaturedCarousel({ events }: { events: Event[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length);
    }, 8000); // Rotate every 8 seconds
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) return null;
  const event = events[index];

  const bgStyle = event.image
    ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%), url(${event.image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : event.coverGradient
      ? { background: event.coverGradient }
      : { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" };

  return (
    <div className="relative rounded-3xl overflow-hidden min-h-[320px] flex flex-col justify-end p-10" style={bgStyle}>
      <div className="relative z-10 max-w-lg">
        <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-none">
          {event.category}
        </Badge>
        <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
          {event.name}
        </h2>
        <div className="flex items-center gap-4 text-white/70 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {event.date.full} &middot; {event.date.time}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {event.location.name}, {event.location.addressLocality}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xl font-bold text-white">{event.attendeeCount}</span>
            <span className="text-white/50">attending</span>
          </div>
          {event.organizer && (
            <span className="text-white/50">by {event.organizer.name}</span>
          )}
        </div>
      </div>

      {/* Carousel dots */}
      {events.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {events.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Horizontal Layout ───────────────────────────────────────────────────────
function HorizontalSignage({ events, stats }: { events: Event[]; stats: CommunityStats | null }) {
  const featured = events.slice(0, 5);
  const upcoming = events.slice(0, 8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      {/* Header */}
      <header className="px-10 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">nhimbe</div>
          <span className="text-white/30">|</span>
          <span className="text-white/50 text-sm">Community Events</span>
        </div>
        {stats && <PlatformStatsBar stats={stats} />}
      </header>

      <div className="flex-1 flex p-8 gap-8">
        {/* Left: Featured event carousel */}
        <div className="flex-1 flex flex-col gap-6">
          <FeaturedCarousel events={featured} />

          {/* Category highlights from stats */}
          {stats && stats.trendingCategories.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/40 uppercase tracking-wider">Popular Categories</span>
              {stats.trendingCategories.slice(0, 5).map((cat) => (
                <div key={cat.category} className="bg-white/5 rounded-lg px-4 py-2 text-center">
                  <div className="text-sm font-semibold">{cat.category}</div>
                  <div className="text-xs text-white/40">{cat.events} events</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Upcoming events list */}
        <div className="w-96 flex flex-col">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Upcoming Events
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {upcoming.map((event) => (
              <SignageEventCard key={event.id} event={event} size="compact" />
            ))}
          </div>
        </div>
      </div>

      <footer className="px-10 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="text-xs text-white/30">
          Powered by <span className="text-white/50 font-semibold">nhimbe</span> &middot; A Mukoko Product
        </div>
        <div className="text-xs text-white/30">
          Discover events at nhimbe.com
        </div>
      </footer>
    </div>
  );
}

// ─── Vertical Layout ─────────────────────────────────────────────────────────
function VerticalSignage({ events, stats }: { events: Event[]; stats: CommunityStats | null }) {
  const featured = events.slice(0, 3);
  const upcoming = events.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col text-white">
      {/* Header */}
      <header className="px-6 py-5 text-center border-b border-white/10">
        <div className="text-2xl font-bold">nhimbe</div>
        <div className="text-white/40 text-sm mt-1">Community Events</div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="px-6 py-4 flex justify-center">
          <PlatformStatsBar stats={stats} />
        </div>
      )}

      {/* Featured carousel */}
      <div className="px-6 py-2">
        <FeaturedCarousel events={featured} />
      </div>

      {/* Upcoming list */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Upcoming</h3>
        <div className="space-y-3">
          {upcoming.map((event) => (
            <SignageEventCard key={event.id} event={event} size="compact" />
          ))}
        </div>
      </div>

      <footer className="px-6 py-3 text-center border-t border-white/10">
        <div className="text-xs text-white/30">
          Powered by <span className="text-white/50 font-semibold">nhimbe</span> &middot; A Mukoko Product
        </div>
      </footer>
    </div>
  );
}

// ─── Main Public Signage Page ────────────────────────────────────────────────
export default function PublicSignagePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { orientation, setOrientation } = useOrientation();

  const loadData = useCallback(async () => {
    try {
      const [eventsData, statsData] = await Promise.all([
        getEvents({ limit: 12 }),
        getCommunityStats().catch(() => null),
      ]);
      setEvents(eventsData.events);
      if (statsData) setStats(statsData);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <OrientationToggle orientation={orientation} onChange={setOrientation} />
      {orientation === "horizontal" ? (
        <HorizontalSignage events={events} stats={stats} />
      ) : (
        <VerticalSignage events={events} stats={stats} />
      )}
    </>
  );
}
