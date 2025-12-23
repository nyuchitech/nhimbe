"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Ticket, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/ui/event-card";
import { events } from "@/lib/data";

type TabType = "attending" | "hosting" | "past";

export default function MyEventsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("attending");

  // Mock data - in a real app, this would come from user's data
  const attendingEvents = events.slice(0, 3);
  const hostingEvents = events.slice(3, 5);
  const pastEvents = events.slice(5, 7);

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
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Events</h1>
          <p className="text-text-secondary mt-1">
            Manage your upcoming gatherings and see past events
          </p>
        </div>
        <Link href="/events/create">
          <Button variant="primary" size="large">
            <CalendarPlus className="w-5 h-5" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-elevated">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary"
                : "bg-surface text-text-tertiary"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {currentEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentEvents.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              date={event.date}
              location={event.location}
              category={event.category}
              coverImage={event.coverImage}
              coverGradient={event.coverGradient}
              attendeeCount={event.attendeeCount}
              friendsCount={event.friendsCount}
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
            {activeTab === "hosting" ? "No events hosted yet" : "No events found"}
          </h3>
          <p className="text-text-secondary mb-6">
            {activeTab === "hosting"
              ? "Create your first event and bring your community together"
              : "Explore events and find gatherings that interest you"}
          </p>
          <Link href={activeTab === "hosting" ? "/events/create" : "/"}>
            <Button variant="primary">
              {activeTab === "hosting" ? "Create Event" : "Explore Events"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
