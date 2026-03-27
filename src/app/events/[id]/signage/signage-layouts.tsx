"use client";

import { useState } from "react";
import { Monitor, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Event } from "@/lib/api";

// ─── Orientation Toggle ──────────────────────────────────────────────────────
export function OrientationToggle({
  orientation,
  onChange,
}: {
  orientation: "horizontal" | "vertical";
  onChange: (o: "horizontal" | "vertical") => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 right-4 z-40 bg-black/40 hover:bg-black/60 text-white rounded-full"
      onClick={() => onChange(orientation === "horizontal" ? "vertical" : "horizontal")}
      title={`Switch to ${orientation === "horizontal" ? "vertical" : "horizontal"} layout`}
    >
      <RotateCcw className="w-4 h-4" />
    </Button>
  );
}

// ─── Shared Footer ───────────────────────────────────────────────────────────
export function SignageFooter() {
  return (
    <div className="text-xs text-white/40">
      Powered by <span className="text-white/60 font-semibold">nhimbe</span> &middot; A Mukoko Product
    </div>
  );
}

// ─── Event Info Block ────────────────────────────────────────────────────────
export function EventInfoBlock({
  event,
  size = "large",
}: {
  event: Event;
  size?: "large" | "medium";
}) {
  const isLarge = size === "large";

  return (
    <div className="text-white">
      {event.category && (
        <div className={`${isLarge ? "text-sm" : "text-xs"} uppercase tracking-wider text-white/60 mb-2`}>
          {event.category}
        </div>
      )}
      <h1 className={`${isLarge ? "text-5xl lg:text-7xl" : "text-3xl lg:text-5xl"} font-bold leading-tight mb-4`}>
        {event.name}
      </h1>
      <div className={`${isLarge ? "text-xl lg:text-2xl" : "text-lg"} text-white/80 space-y-1`}>
        <p>{event.date.full} &middot; {event.date.time}</p>
        <p>{event.location.name}, {event.location.addressLocality}</p>
      </div>
      {event.organizer && (
        <p className={`${isLarge ? "text-lg" : "text-base"} text-white/60 mt-3`}>
          Hosted by {event.organizer.name}
        </p>
      )}
    </div>
  );
}

// ─── QR Code Block (for signage — "Scan to register") ──────────────────────
export function SignageQRBlock({
  event,
  size = "large",
}: {
  event: Event;
  size?: "large" | "medium";
}) {
  const isLarge = size === "large";
  const eventUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.shortCode}`;

  return (
    <div className="bg-white rounded-2xl p-6 text-center inline-block">
      {/* Use external QR service for reliable scanning on signage */}
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(eventUrl)}&bgcolor=FFFFFF&color=000000`}
        alt="Scan to register"
        className={`${isLarge ? "w-48 h-48" : "w-32 h-32"} mx-auto`}
        width={isLarge ? 192 : 128}
        height={isLarge ? 192 : 128}
      />
      <p className={`${isLarge ? "text-base" : "text-sm"} text-gray-800 font-semibold mt-3`}>
        Scan to register
      </p>
      <p className="text-xs text-gray-500 mt-1">{eventUrl}</p>
    </div>
  );
}

// ─── Cover Image Background ─────────────────────────────────────────────────
export function CoverBackground({
  event,
  children,
  className = "",
}: {
  event: Event;
  children: React.ReactNode;
  className?: string;
}) {
  const bgStyle = event.image
    ? { backgroundImage: `url(${event.image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : event.coverGradient
      ? { background: event.coverGradient }
      : { background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" };

  return (
    <div className={`relative ${className}`} style={bgStyle}>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────
export function CountdownTimer({ startDate }: { startDate: string }) {
  const [now, setNow] = useState(Date.now());

  // Update every second
  useState(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  });

  const target = new Date(startDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return (
      <div className="text-white text-center">
        <div className="text-2xl font-bold text-green-400">Happening Now</div>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Mins", value: minutes },
    { label: "Secs", value: seconds },
  ];

  return (
    <div className="flex gap-4">
      {units.map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[72px]">
            <div className="text-3xl font-bold text-white font-mono">
              {unit.value.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="text-xs text-white/60 mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Attendee Count Display ──────────────────────────────────────────────────
export function AttendeeDisplay({
  count,
  capacity,
  size = "large",
}: {
  count: number;
  capacity?: number;
  size?: "large" | "medium";
}) {
  const isLarge = size === "large";

  return (
    <div className="text-white">
      <div className={`${isLarge ? "text-4xl" : "text-2xl"} font-bold`}>
        {count}
        {capacity && (
          <span className="text-white/40 font-normal">/{capacity}</span>
        )}
      </div>
      <div className={`${isLarge ? "text-sm" : "text-xs"} text-white/60`}>
        {capacity ? "registered" : "attending"}
      </div>
    </div>
  );
}

// ─── useOrientation hook ─────────────────────────────────────────────────────
export function useOrientation() {
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(() => {
    if (typeof window === "undefined") return "horizontal";
    return window.innerHeight > window.innerWidth ? "vertical" : "horizontal";
  });

  return { orientation, setOrientation };
}
