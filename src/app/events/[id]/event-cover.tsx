"use client";

import Image from "next/image";
import { Flame, TrendingUp, Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Event, EventStats } from "@/lib/api";
import type { ReviewStats } from "@/lib/api";

interface EventCoverProps {
  event: Event;
  stats: EventStats | null;
  reviewStats: ReviewStats | null;
}

function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function EventCover({ event, stats, reviewStats }: EventCoverProps) {
  const coverStyle = event.image
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('${event.image}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: event.coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

  return (
    <div
      data-slot="event-cover"
      className="h-100 rounded-(--radius-card) relative mb-8 overflow-hidden"
      style={coverStyle}
    >
      {event.image && (
        <Image src={event.image} alt={event.name} fill className="object-cover" priority />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

      {/* Top Left Badges */}
      <div className="absolute top-6 left-6 flex gap-3 z-10">
        <div className="bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center">
          <div className="text-2xl font-extrabold text-white leading-none" style={{ color: "var(--event-primary)" }}>
            {event.date.day}
          </div>
          <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
            {event.date.month}
          </div>
        </div>

        <Badge
          className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase self-start border-0"
          style={{ backgroundColor: "var(--event-primary)", color: "#0A0A0A" }}
        >
          {event.category}
        </Badge>

        {stats?.isHot && (
          <Badge className="bg-accent/90 text-background self-start border-0">
            <Flame className="w-3.5 h-3.5" /> HOT
          </Badge>
        )}
        {!stats?.isHot && stats?.trend && stats.trend > 20 && (
          <Badge className="bg-green-500/90 text-white self-start border-0">
            <TrendingUp className="w-3.5 h-3.5" /> +{stats.trend}%
          </Badge>
        )}
      </div>

      {/* Top Right Stats */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10">
        {stats?.views !== undefined && stats.views > 0 && (
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">{formatViews(stats.views)} views</span>
          </div>
        )}
        {reviewStats && reviewStats.averageRating > 0 && reviewStats.totalReviews > 0 && (
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="text-sm font-medium">{reviewStats.averageRating.toFixed(1)}</span>
            <span className="text-xs text-white/60">({reviewStats.totalReviews})</span>
          </div>
        )}
      </div>

      {/* Bottom Tags */}
      {event.keywords && event.keywords.length > 0 && (
        <div className="absolute bottom-6 left-6 flex gap-2 flex-wrap max-w-[80%] z-10">
          {event.keywords.slice(0, 5).map((tag) => (
            <span key={tag} className="bg-black/50 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full text-[11px]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
