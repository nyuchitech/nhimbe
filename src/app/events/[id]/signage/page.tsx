"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getEventById, type Event } from "@/lib/api";
import {
  OrientationToggle,
  SignageFooter,
  EventInfoBlock,
  SignageQRBlock,
  CoverBackground,
  CountdownTimer,
  AttendeeDisplay,
  useOrientation,
} from "./signage-layouts";

// ─── Horizontal Layout ───────────────────────────────────────────────────────
function HorizontalSignage({ event }: { event: Event }) {
  return (
    <CoverBackground event={event} className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Left: Event info */}
        <div className="flex-1 flex flex-col justify-center px-16 py-12">
          <EventInfoBlock event={event} size="large" />
          <div className="mt-10">
            <CountdownTimer startDate={event.startDate} />
          </div>
          <div className="mt-8">
            <AttendeeDisplay
              count={event.attendeeCount}
              capacity={event.maximumAttendeeCapacity}
            />
          </div>
        </div>

        {/* Right: QR code + branding */}
        <div className="w-96 flex flex-col items-center justify-center px-12">
          <SignageQRBlock event={event} size="large" />
        </div>
      </div>

      <footer className="px-16 py-6">
        <SignageFooter />
      </footer>
    </CoverBackground>
  );
}

// ─── Vertical Layout ─────────────────────────────────────────────────────────
function VerticalSignage({ event }: { event: Event }) {
  return (
    <CoverBackground event={event} className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
        <EventInfoBlock event={event} size="large" />
        <div className="mt-10">
          <CountdownTimer startDate={event.startDate} />
        </div>
        <div className="mt-8">
          <AttendeeDisplay
            count={event.attendeeCount}
            capacity={event.maximumAttendeeCapacity}
          />
        </div>
        <div className="mt-10">
          <SignageQRBlock event={event} size="large" />
        </div>
      </div>

      <footer className="px-8 py-6 text-center">
        <SignageFooter />
      </footer>
    </CoverBackground>
  );
}

// ─── Public Signage Page ─────────────────────────────────────────────────────
export default function PublicSignagePage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const { orientation, setOrientation } = useOrientation();

  useEffect(() => {
    async function load() {
      const result = await getEventById(id);
      if (result) setEvent(result.event);
      setLoading(false);
    }
    load();
  }, [id]);

  // Auto-refresh event data every 60s (to update attendee count, etc.)
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getEventById(id);
      if (result) setEvent(result.event);
    }, 60000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p className="text-xl">Event not found</p>
      </div>
    );
  }

  return (
    <>
      <OrientationToggle orientation={orientation} onChange={setOrientation} />
      {orientation === "horizontal" ? (
        <HorizontalSignage event={event} />
      ) : (
        <VerticalSignage event={event} />
      )}
    </>
  );
}
