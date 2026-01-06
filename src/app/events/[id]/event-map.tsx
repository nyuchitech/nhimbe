"use client";

import { useState } from "react";
import { MapPin, ExternalLink, Navigation } from "lucide-react";

interface EventMapProps {
  venue: string;
  address: string;
  city: string;
  country: string;
}

export function EventMap({ venue, address, city, country }: EventMapProps) {
  const [mapError, setMapError] = useState(false);

  // Construct the full address for the map query
  const fullAddress = [venue, address, city, country].filter(Boolean).join(", ");
  const encodedAddress = encodeURIComponent(fullAddress);

  // Google Maps embed URL (using the free embed format without API key)
  const embedUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  // Google Maps link for opening in new tab
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  // Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

  if (mapError) {
    // Fallback UI when map fails to load
    return (
      <div
        className="rounded-[var(--radius-card)] overflow-hidden"
        style={{ backgroundColor: "var(--event-surface)" }}
      >
        <div className="p-6 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--event-primary)" }} />
          <h4 className="font-semibold mb-1">{venue}</h4>
          <p className="text-sm text-foreground/60 mb-4">
            {address && `${address}, `}{city}, {country}
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: "var(--event-primary)", color: "#0A0A0A" }}
            >
              <ExternalLink className="w-4 h-4" />
              View on Google Maps
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-card)] overflow-hidden"
      style={{ backgroundColor: "var(--event-surface)" }}
    >
      {/* Map Header */}
      <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "var(--event-surface)" }}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: "var(--event-primary)" }} />
          <span className="font-semibold text-sm">Event Location</span>
        </div>
        <div className="flex gap-2">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--event-primary)", color: "#0A0A0A" }}
          >
            <Navigation className="w-3.5 h-3.5" />
            Directions
          </a>
        </div>
      </div>

      {/* Map Embed */}
      <div className="relative aspect-[16/9] w-full">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setMapError(true)}
          title={`Map showing ${venue}`}
        />
      </div>

      {/* Address Footer */}
      <div className="p-4">
        <h4 className="font-semibold text-sm mb-1">{venue}</h4>
        <p className="text-xs text-foreground/60">
          {address && `${address}, `}{city}, {country}
        </p>
      </div>
    </div>
  );
}
