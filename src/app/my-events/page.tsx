"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarPlus, Ticket, Users, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/ui/event-card";
import { getEvents, getUserRegistrations, type Event, type Registration } from "@/lib/api";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-context";

type TabType = "attending" | "hosting" | "past";

function MyEventsContent() {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("attending");

  // Fetch events and user registrations on mount
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all events and user's registrations in parallel
        const [eventsResponse, registrations] = await Promise.all([
          getEvents({ limit: 100 }),
          getUserRegistrations(user.id).catch(() => []),
        ]);

        setAllEvents(eventsResponse.events);
        setUserRegistrations(registrations);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  const now = new Date();

  // Filter events the user is attending (has registration for)
  const registeredEventIds = new Set(
    userRegistrations
      .filter((r) => r.status === "registered" || r.status === "approved" || r.status === "pending")
      .map((r) => r.eventId)
  );

  // Filter events the user is hosting (their name matches organizer name)
  // In production, this should be based on a host_id field in the event
  const hostingEventIds = new Set(
    allEvents
      .filter((e) => {
        // Check if user's name or handle matches the organizer
        const userNameLower = user?.name?.toLowerCase() || "";
        const organizerNameLower = e.organizer.name.toLowerCase();
        return organizerNameLower === userNameLower ||
               e.organizer.identifier === `@${userNameLower.replace(/\s+/g, '')}`;
      })
      .map((e) => e.id)
  );

  // Categorize events
  const attendingEvents = allEvents.filter(
    (e) => registeredEventIds.has(e.id) && new Date(e.startDate) >= now && !hostingEventIds.has(e.id)
  );

  const hostingEvents = allEvents.filter(
    (e) => hostingEventIds.has(e.id) && new Date(e.startDate) >= now
  );

  const pastEvents = allEvents.filter(
    (e) => (registeredEventIds.has(e.id) || hostingEventIds.has(e.id)) && new Date(e.startDate) < now
  );

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "attending", label: "Attending", icon: <Ticket className="w-4 h-4" />, count: attendingEvents.length },
    { id: "hosting", label: "Hosting", icon: <Users className="w-4 h-4" />, count: hostingEvents.length },
    { id: "past", label: "Past", icon: <Clock className="w-4 h-4" />, count: pastEvents.length },
  ];

  const currentEvents = {
    attending: attendingEvents,
    hosting: hostingEvents,
    past: pastEvents,
  }[activeTab];

  return (
    <div className="max-w-300 mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Events</h1>
          <p className="text-text-secondary mt-1">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}!` : "Manage your upcoming gatherings and see past events"}
          </p>
        </div>
        <Link href="/events/create">
          <Button variant="default" size="lg">
            <CalendarPlus className="w-5 h-5" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-elevated overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors rounded-none h-auto ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <Badge variant={activeTab === tab.id ? "default" : "secondary"}>
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : currentEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {currentEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.name}
              date={event.date}
              location={event.location}
              category={event.category}
              coverImage={event.image}
              coverGradient={event.coverGradient}
              attendeeCount={event.attendeeCount}
              friendsCount={event.friendsCount}
              isHosting={activeTab === "hosting" || hostingEventIds.has(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            {activeTab === "hosting" ? (
              <Users className="w-8 h-8 text-text-tertiary" />
            ) : (
              <Ticket className="w-8 h-8 text-text-tertiary" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {activeTab === "hosting" ? "No events hosted yet" : activeTab === "past" ? "No past events" : "No events found"}
          </h3>
          <p className="text-text-secondary mb-6">
            {activeTab === "hosting"
              ? "Create your first event and bring your community together"
              : activeTab === "past"
              ? "Events you've attended or hosted will appear here"
              : "Explore events and find gatherings that interest you"}
          </p>
          <Link href={activeTab === "hosting" ? "/events/create" : "/"}>
            <Button variant="default">
              {activeTab === "hosting" ? "Create Event" : "Explore Events"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// Wrap with AuthGuard to require authentication
export default function MyEventsPage() {
  return (
    <AuthGuard>
      <MyEventsContent />
    </AuthGuard>
  );
}
