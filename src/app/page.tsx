"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/ui/category-chip";
import { EventCard } from "@/components/ui/event-card";
import { events, categories } from "@/lib/data";

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState("All Events");

  const filteredEvents =
    activeCategory === "All Events"
      ? events
      : events.filter((e) => e.category === activeCategory);

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="font-serif italic text-lg text-foreground/60 mb-4">
            &ldquo;Together we gather, together we grow&rdquo;
          </p>

          <h1 className="font-serif text-4xl md:text-[56px] font-bold leading-tight mb-6">
            Discover <span className="text-primary">gatherings</span>
            <br />
            that move you
          </h1>

          <p className="text-lg text-foreground/60 max-w-[600px] mx-auto mb-10 leading-relaxed">
            From tech meetups to cultural celebrations, find events that bring
            your community together. Powered by Ubuntu philosophy.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="primary" size="large">
              <Compass className="w-5 h-5" />
              Explore Events
            </Button>
            <Link href="/events/create">
              <Button variant="secondary" size="large">
                <CalendarPlus className="w-5 h-5" />
                Host an Event
              </Button>
            </Link>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-surface px-4 py-2 rounded-full text-sm text-foreground/60 mt-12">
            A <span className="text-secondary font-semibold">Mukoko</span> Product
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 border-b border-elevated">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-3 flex-wrap justify-center">
            {categories.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                active={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[28px] font-bold">Featured Events</h2>
            <Link
              href="/events"
              className="text-sm text-primary font-medium hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                date={event.date}
                location={event.location.name}
                category={event.category}
                coverImage={event.coverImage}
                coverGradient={event.coverGradient}
                attendeeCount={event.attendeeCount}
                friendsCount={event.friendsCount}
              />
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-16 text-foreground/60">
              <p className="text-lg">No events found in this category.</p>
              <p className="text-sm mt-2">Try selecting a different category or check back later.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
