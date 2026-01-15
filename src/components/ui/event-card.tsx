import Link from "next/link";
import { MapPin, Settings, Eye, TrendingUp, Flame, Star } from "lucide-react";

interface EventCardProps {
  id: string;
  title: string;
  date: { day: string; month: string };
  location: { venue: string; city: string; country: string };
  category: string;
  coverImage?: string;
  coverGradient?: string;
  attendeeCount: number;
  friendsCount?: number;
  isHosting?: boolean;
  // New open data props
  views?: number;
  trend?: number; // percentage change in views/interest
  isHot?: boolean;
  rating?: number;
  reviewCount?: number;
  spotsLeft?: number;
  capacity?: number;
}

export function EventCard({
  id,
  title,
  date,
  location,
  category,
  coverImage,
  coverGradient,
  attendeeCount,
  friendsCount,
  isHosting,
  // New props
  views,
  trend,
  isHot,
  rating,
  reviewCount,
  spotsLeft,
  capacity,
}: EventCardProps) {
  const coverStyle = coverImage
    ? {
        background: `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${coverImage}') center/cover`,
      }
    : { background: coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

  const formatViews = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const isAlmostFull = spotsLeft !== undefined && capacity !== undefined && spotsLeft < capacity * 0.2;

  return (
    <Link href={`/events/${id}`} className="block">
      <div className="rounded-(--radius-card) overflow-hidden bg-surface cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40">
        {/* Cover */}
        <div className="h-50 relative" style={coverStyle}>
          {/* Date Badge - theme-aware */}
          <div className="absolute top-4 left-4 bg-background/90 dark:bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center border border-foreground/10">
            <div className="text-2xl font-extrabold text-primary leading-none">
              {date.day}
            </div>
            <div className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide">
              {date.month}
            </div>
          </div>

          {/* Top Right Badges */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {/* Category Badge */}
            <div className="bg-secondary text-background px-3 py-1.5 rounded-full text-[11px] font-bold uppercase">
              {category}
            </div>

            {/* Hot Badge */}
            {isHot && (
              <div className="flex items-center gap-1 bg-accent/90 text-background px-2.5 py-1 rounded-full">
                <Flame className="w-3 h-3" />
                <span className="text-[10px] font-bold">HOT</span>
              </div>
            )}

            {/* Trending Badge */}
            {trend && trend > 15 && !isHot && (
              <div className="flex items-center gap-1 bg-green-500/90 text-white px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">+{trend}%</span>
              </div>
            )}
          </div>

          {/* Bottom Left - Views & Rating (Open Data) */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            {views !== undefined && views > 0 && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full">
                <Eye className="w-3 h-3" />
                <span className="text-[11px] font-medium">{formatViews(views)}</span>
              </div>
            )}
            {rating !== undefined && rating > 0 && reviewCount !== undefined && reviewCount > 0 && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 text-accent fill-accent" />
                <span className="text-[11px] font-medium">{rating.toFixed(1)}</span>
                <span className="text-[10px] text-white/60">({reviewCount})</span>
              </div>
            )}
          </div>

          {/* Almost Full Warning */}
          {isAlmostFull && (
            <div className="absolute bottom-4 right-4 bg-red-500/90 text-white px-2.5 py-1 rounded-full">
              <span className="text-[10px] font-bold">Only {spotsLeft} left!</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="text-lg font-bold mb-2.5 leading-tight">{title}</h3>

          <div className="flex items-center gap-2 text-sm text-foreground/60 mb-4">
            <MapPin className="w-4 h-4" />
            <span>{location.city}, {location.country}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Attendee Avatars */}
              <div className="flex -space-x-2.5">
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-linear-to-br from-secondary to-primary" />
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-linear-to-br from-accent to-[#FF6B6B]" />
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-linear-to-br from-primary to-[#00B0FF]" />
              </div>
              <span className="text-sm text-foreground/60 ml-2">
                +{attendeeCount} going
              </span>
            </div>

            {friendsCount && friendsCount > 0 && (
              <span className="bg-primary/15 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                {friendsCount} friend{friendsCount > 1 ? "s" : ""}
              </span>
            )}

            {isHosting && (
              <Link
                href={`/events/${id}/manage`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-elevated text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                Manage
              </Link>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
