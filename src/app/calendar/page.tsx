"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Loader2 } from "lucide-react";
import { getEvents, type Event } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch events on mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await getEvents({ limit: 100 });
        setEvents(response.events);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  // Get events for each day
  const eventsByDay = useMemo(() => {
    const map: Record<number, Event[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.date.iso);
      if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
        const day = eventDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(event);
      }
    });
    return map;
  }, [events, year, month]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-text-secondary mt-1">
            View all upcoming events at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium bg-surface border border-elevated rounded-lg hover:bg-elevated transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="bg-surface rounded-xl border border-elevated overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-elevated">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-sm font-medium text-text-secondary"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-b border-r border-elevated ${
                    day === null ? "bg-elevated/30" : ""
                  } ${index % 7 === 6 ? "border-r-0" : ""}`}
                >
                  {day !== null && (
                    <>
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                          isToday(day)
                            ? "bg-primary text-background"
                            : "text-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {eventsByDay[day]?.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="block px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors truncate"
                          >
                            {event.title}
                          </Link>
                        ))}
                        {eventsByDay[day]?.length > 2 && (
                          <span className="text-xs text-text-tertiary px-2">
                            +{eventsByDay[day].length - 2} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events List */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-6">Upcoming This Month</h3>
            <div className="space-y-4">
              {events
                .filter((event) => {
                  const eventDate = new Date(event.date.iso);
                  return eventDate.getFullYear() === year && eventDate.getMonth() === month;
                })
                .sort((a, b) => new Date(a.date.iso).getTime() - new Date(b.date.iso).getTime())
                .map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-elevated hover:border-primary/50 transition-colors"
                  >
                    <div className="w-14 h-14 flex flex-col items-center justify-center bg-elevated rounded-lg">
                      <span className="text-xs text-text-tertiary uppercase">
                        {event.date.month}
                      </span>
                      <span className="text-xl font-bold text-foreground">
                        {event.date.day}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-text-secondary">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {event.location.venue}, {event.location.city}
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                      {event.category}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
