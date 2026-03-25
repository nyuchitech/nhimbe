"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Calendar, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadICS,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getOutlookLiveUrl,
  type CalendarEvent,
} from "@/lib/calendar";

interface EventActionsProps {
  event: {
    name: string;
    shortCode: string;
    startDate: string;
    date: {
      day: string;
      month: string;
      full: string;
      time: string;
    };
    location: {
      name: string;
      streetAddress?: string;
      addressLocality: string;
      addressCountry: string;
    };
    description: string;
  };
}

// Helper to create CalendarEvent from event data
function createCalendarEvent(event: EventActionsProps["event"]): CalendarEvent {
  const startDate = new Date(event.startDate);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours default

  return {
    title: event.name,
    description: event.description,
    location: `${event.location.name}, ${event.location.streetAddress}, ${event.location.addressLocality}, ${event.location.addressCountry}`,
    startDate,
    endDate,
    url: typeof window !== "undefined" ? `${window.location.origin}/e/${event.shortCode}` : undefined,
  };
}

export function EventActions({ event }: EventActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleAddToCalendar = () => {
    // Generate ICS file content
    const startDate = new Date(event.startDate);
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
SUMMARY:${event.name}
DESCRIPTION:${event.description.slice(0, 200).replace(/\n/g, "\\n")}
LOCATION:${event.location.name}, ${event.location.streetAddress}, ${event.location.addressLocality}, ${event.location.addressCountry}
END:VEVENT
END:VCALENDAR`;

    // Create and download ICS file
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.name.toLowerCase().replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGetDirections = () => {
    const address = encodeURIComponent(
      `${event.location.name}, ${event.location.streetAddress}, ${event.location.addressLocality}, ${event.location.addressCountry}`
    );
    // Open in Google Maps (works on all platforms)
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Check out ${event.name} on nhimbe`,
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
      <Button
        variant="ghost"
        onClick={handleAddToCalendar}
        className="text-primary text-sm font-semibold hover:underline p-0 h-auto min-h-0"
      >
        Add to Calendar
      </Button>

      {/* Get Directions button - rendered separately */}
      <Button
        variant="ghost"
        onClick={handleGetDirections}
        className="text-primary text-sm font-semibold hover:underline p-0 h-auto min-h-0"
      >
        Get Directions
      </Button>

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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calendarEvent = createCalendarEvent(event);

  const handleDownloadICS = () => {
    downloadICS(calendarEvent);
    setShowDropdown(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(calendarEvent), "_blank");
    setShowDropdown(false);
  };

  const handleOutlook = () => {
    window.open(getOutlookCalendarUrl(calendarEvent), "_blank");
    setShowDropdown(false);
  };

  const handleOutlookLive = () => {
    window.open(getOutlookLiveUrl(calendarEvent), "_blank");
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1 text-primary text-sm font-semibold hover:underline p-0 h-auto min-h-0"
      >
        <Calendar className="w-4 h-4" />
        Add to Calendar
        <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
      </Button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 bg-surface rounded-xl shadow-xl border border-elevated py-2 min-w-50 z-50">
          <Button
            variant="ghost"
            onClick={handleDownloadICS}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors flex items-center gap-3 rounded-none h-auto justify-start"
          >
            <Download className="w-4 h-4 text-text-tertiary" />
            <div>
              <div className="font-medium">Download .ics</div>
              <div className="text-xs text-text-tertiary">Apple Calendar, etc.</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            onClick={handleGoogleCalendar}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors flex items-center gap-3 rounded-none h-auto justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 4H18V3a1 1 0 0 0-2 0v1H8V3a1 1 0 0 0-2 0v1H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4zm0 15.5h-15a.5.5 0 0 1-.5-.5V9h16v10a.5.5 0 0 1-.5.5z" />
            </svg>
            <div>
              <div className="font-medium">Google Calendar</div>
              <div className="text-xs text-text-tertiary">Opens in new tab</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            onClick={handleOutlook}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors flex items-center gap-3 rounded-none h-auto justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.5 4H2.5C1.67 4 1 4.67 1 5.5v13c0 .83.67 1.5 1.5 1.5h19c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5zm-10 12l-8-5V7l8 5 8-5v4l-8 5z" />
            </svg>
            <div>
              <div className="font-medium">Outlook (Office 365)</div>
              <div className="text-xs text-text-tertiary">Work or school</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            onClick={handleOutlookLive}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors flex items-center gap-3 rounded-none h-auto justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.5 4H2.5C1.67 4 1 4.67 1 5.5v13c0 .83.67 1.5 1.5 1.5h19c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5zm-10 12l-8-5V7l8 5 8-5v4l-8 5z" />
            </svg>
            <div>
              <div className="font-medium">Outlook.com</div>
              <div className="text-xs text-text-tertiary">Personal account</div>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}

export function GetDirectionsButton({ event }: EventActionsProps) {
  const handleGetDirections = () => {
    const address = encodeURIComponent(
      `${event.location.name}, ${event.location.streetAddress}, ${event.location.addressLocality}, ${event.location.addressCountry}`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, "_blank");
  };

  return (
    <Button
      variant="ghost"
      onClick={handleGetDirections}
      className="text-primary text-sm font-semibold hover:underline p-0 h-auto min-h-0"
    >
      Get Directions
    </Button>
  );
}

export function ShareButton({ event }: EventActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/e/${event.shortCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Check out ${event.name} on nhimbe`,
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
