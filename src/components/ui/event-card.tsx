import Link from "next/link";
import { MapPin, Settings } from "lucide-react";

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
}: EventCardProps) {
  const coverStyle = coverImage
    ? {
        background: `linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${coverImage}') center/cover`,
      }
    : { background: coverGradient || "linear-gradient(135deg, #004D40, #00796B)" };

  return (
    <Link href={`/events/${id}`} className="block">
      <div className="rounded-[var(--radius-card)] overflow-hidden bg-surface cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40">
        {/* Cover */}
        <div className="h-[200px] relative" style={coverStyle}>
          {/* Date Badge */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3.5 py-2.5 rounded-xl text-center">
            <div className="text-2xl font-extrabold text-primary leading-none">
              {date.day}
            </div>
            <div className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wide">
              {date.month}
            </div>
          </div>

          {/* Category Badge */}
          <div className="absolute top-4 right-4 bg-secondary text-background px-3 py-1.5 rounded-full text-[11px] font-bold uppercase">
            {category}
          </div>
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
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-gradient-to-br from-secondary to-primary" />
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-gradient-to-br from-accent to-[#FF6B6B]" />
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-gradient-to-br from-primary to-[#00B0FF]" />
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
