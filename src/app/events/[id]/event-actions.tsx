"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventActionsProps {
  event: {
    title: string;
    shortCode: string;
    date: {
      day: string;
      month: string;
      full: string;
      time: string;
      iso: string;
    };
    location: {
      venue: string;
      address: string;
      city: string;
      country: string;
    };
    description: string;
  };
}

export function EventActions({ event }: EventActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleAddToCalendar = () => {
    // Generate ICS file content
    const startDate = new Date(event.date.iso);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const formatDateForICS = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//nhimbe//Event//EN
BEGIN:VEVENT
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.slice(0, 200).replace(/\n/g, "\\n")}
LOCATION:${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.country}
END:VEVENT
END:VCALENDAR`;

    // Create and download ICS file
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.toLowerCase().replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(
      `${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.country}`
    );
    // Open in Google Maps (works on all platforms)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on nhimbe`,
          url,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      {/* Add to Calendar button */}
      <button
        onClick={handleAddToCalendar}
        className="text-primary text-sm font-semibold hover:underline"
      >
        Add to Calendar
      </button>

      {/* Get Directions button - rendered separately */}
      <button
        onClick={handleGetDirections}
        className="text-primary text-sm font-semibold hover:underline"
      >
        Get Directions
      </button>

      {/* Share button */}
      <Button onClick={handleShare} variant="secondary" className="flex-1 py-2.5 text-sm">
        <Share2 className="w-4 h-4" />
        {copySuccess ? "Copied!" : "Share"}
      </Button>
    </>
  );
}

// Separate components for individual use in the page
export function AddToCalendarButton({ event }: EventActionsProps) {
  const handleAddToCalendar = () => {
    const startDate = new Date(event.date.iso);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const formatDateForICS = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//nhimbe//Event//EN
BEGIN:VEVENT
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.slice(0, 200).replace(/\n/g, "\\n")}
LOCATION:${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.country}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.toLowerCase().replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleAddToCalendar}
      className="text-primary text-sm font-semibold hover:underline"
    >
      Add to Calendar
    </button>
  );
}

export function GetDirectionsButton({ event }: EventActionsProps) {
  const handleGetDirections = () => {
    const address = encodeURIComponent(
      `${event.location.venue}, ${event.location.address}, ${event.location.city}, ${event.location.country}`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
  };

  return (
    <button
      onClick={handleGetDirections}
      className="text-primary text-sm font-semibold hover:underline"
    >
      Get Directions
    </button>
  );
}

export function ShareButton({ event }: EventActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on nhimbe`,
          url,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button onClick={handleShare} variant="secondary" className="flex-1 py-2.5 text-sm">
      <Share2 className="w-4 h-4" />
      {copySuccess ? "Copied!" : "Share"}
    </Button>
  );
}
