"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Compass, CalendarPlus, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/ui/category-chip";
import { EventCard } from "@/components/ui/event-card";
import { events, categories, cities } from "@/lib/data";

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCity, setActiveCity] = useState("All Cities");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Get unique cities from events
  const availableCities = useMemo(() => {
    const citySet = new Set(events.map((e) => `${e.location.city}, ${e.location.country}`));
    return Array.from(citySet).sort();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const categoryMatch = activeCategory === "All" || e.category === activeCategory;
      const cityMatch =
        activeCity === "All Cities" ||
        `${e.location.city}, ${e.location.country}` === activeCity;
      return categoryMatch && cityMatch;
    });
  }, [activeCategory, activeCity]);

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="font-serif italic text-lg text-text-secondary mb-4">
            &ldquo;Together we gather, together we grow&rdquo;
          </p>

          <h1 className="font-serif text-4xl md:text-[56px] font-bold leading-tight mb-6 text-foreground">
            Discover <span className="text-primary">gatherings</span>
            <br />
            that move you
          </h1>

          <p className="text-lg text-text-secondary max-w-[600px] mx-auto mb-10 leading-relaxed">
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

          <div className="inline-flex items-center gap-1.5 bg-surface px-4 py-2 rounded-full text-sm text-text-tertiary mt-12">
            A <span className="text-secondary font-semibold">Mukoko</span> Product
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-10 border-b border-elevated">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Location Filter */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="flex items-center gap-2 bg-surface px-4 py-2.5 rounded-full text-sm font-medium hover:bg-elevated transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span>{activeCity}</span>
                <ChevronDown
                  className={`w-4 h-4 text-text-tertiary transition-transform ${
                    showCityDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showCityDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-surface rounded-xl shadow-xl border border-elevated py-2 min-w-[220px] z-50">
                  <button
                    onClick={() => {
                      setActiveCity("All Cities");
                      setShowCityDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors ${
                      activeCity === "All Cities"
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    All Cities
                  </button>
                  {availableCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setActiveCity(city);
                        setShowCityDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-elevated transition-colors ${
                        activeCity === city
                          ? "text-primary font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-3 flex-wrap justify-center">
            <CategoryChip
              label="All"
              active={activeCategory === "All"}
              onClick={() => setActiveCategory("All")}
            />
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
            <div>
              <h2 className="text-[28px] font-bold">
                {activeCity === "All Cities" ? "Featured Events" : `Events in ${activeCity.split(",")[0]}`}
              </h2>
              {activeCategory !== "All" && (
                <p className="text-text-tertiary text-sm mt-1">
                  Filtered by: {activeCategory}
                </p>
              )}
            </div>
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
                location={event.location}
                category={event.category}
                coverImage={event.coverImage}
                coverGradient={event.coverGradient}
                attendeeCount={event.attendeeCount}
                friendsCount={event.friendsCount}
              />
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-lg">No events found.</p>
              <p className="text-sm mt-2 text-text-tertiary">
                Try selecting a different city or category.
              </p>
              <button
                onClick={() => {
                  setActiveCity("All Cities");
                  setActiveCategory("All");
                }}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
