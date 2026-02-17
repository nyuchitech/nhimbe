"use client";

import Link from "next/link";
import Image from "next/image";
import { formatEventDateTime } from "@/lib/timezone";

interface EventCardHorizontalProps {
  _id: string;
  name: string;
  dateDisplay: {
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
  image?: string;
  coverGradient?: string;
}

export function EventCardHorizontal({
  _id,
  name,
  dateDisplay,
  location,
  image,
  coverGradient,
}: EventCardHorizontalProps) {
  // Format the datetime for display
  const dateTime = dateDisplay.full
    ? formatEventDateTime(dateDisplay.full, dateDisplay.time)
    : `${dateDisplay.month} ${dateDisplay.day}${dateDisplay.time ? `, ${dateDisplay.time}` : ""}`;

  const venueDisplay = location.venue
    ? `${location.venue}`
    : `${location.city}, ${location.country}`;

  return (
    <Link href={`/events/${_id}`} className="block group">
      <div className="flex gap-4 p-2 -m-2 rounded-xl hover:bg-surface/50 transition-colors">
        {/* Square Image Thumbnail */}
        <div
          className="w-[72px] h-[72px] shrink-0 rounded-lg overflow-hidden"
          style={
            !image
              ? { background: coverGradient || "linear-gradient(135deg, #004D40, #00796B)" }
              : undefined
          }
        >
          {image && (
            <Image
              src={image}
              alt={name}
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
            {name}
          </h3>

          {/* Venue */}
          <p className="text-sm text-text-tertiary truncate">{venueDisplay}</p>
        </div>
      </div>
    </Link>
  );
}
