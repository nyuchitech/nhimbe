"use client";

import Link from "next/link";
import Image from "next/image";
import { formatEventDateTime } from "@/lib/timezone";

interface EventCardHorizontalProps {
  id: string;
  title: string;
  date: {
    day: string;
    month: string;
    full?: string;
    time?: string;
  };
  location: {
    venue: string;
    city: string;
    country: string;
  };
  coverImage?: string;
  coverGradient?: string;
}

export function EventCardHorizontal({
  id,
  title,
  date,
  location,
  coverImage,
  coverGradient,
}: EventCardHorizontalProps) {
  // Format the datetime for display
  const dateTime = date.full
    ? formatEventDateTime(date.full, date.time)
    : `${date.month} ${date.day}${date.time ? `, ${date.time}` : ""}`;

  const venueDisplay = location.venue
    ? `${location.venue}`
    : `${location.city}, ${location.country}`;

  return (
    <Link href={`/events/${id}`} className="block group">
      <div className="flex gap-4 p-2 -m-2 rounded-xl hover:bg-surface/50 transition-colors">
        {/* Square Image Thumbnail */}
        <div
          className="w-[72px] h-[72px] flex-shrink-0 rounded-lg overflow-hidden"
          style={
            !coverImage
              ? { background: coverGradient || "linear-gradient(135deg, #004D40, #00796B)" }
              : undefined
          }
        >
          {coverImage && (
            <Image
              src={coverImage}
              alt={title}
              width={72}
              height={72}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Date/Time */}
          <p className="text-sm text-text-secondary mb-1">{dateTime}</p>

          {/* Title */}
          <h3 className="font-semibold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>

          {/* Venue */}
          <p className="text-sm text-text-tertiary truncate">{venueDisplay}</p>
        </div>
      </div>
    </Link>
  );
}
