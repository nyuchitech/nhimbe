"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";
import { CategoryChip } from "@/components/ui/category-chip";
import { EventCard } from "@/components/ui/event-card";
import { getEvents, getCategories, getCities, type Event } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCity, setActiveCity] = useState("All Cities");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsResponse, categoriesData, citiesData] = await Promise.all([
          getEvents({ limit: 100 }),
          getCategories(),
          getCities(),
        ]);
        setEvents(eventsResponse.events);
        setCategories(categoriesData);
        setCities(citiesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const categoryMatch = activeCategory === "All" || e.category === activeCategory;
      const cityMatch =
        activeCity === "All Cities" ||
        `${e.location.city}, ${e.location.country}` === activeCity;
      const searchMatch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return categoryMatch && cityMatch && searchMatch;
    });
  }, [events, activeCategory, activeCity, searchQuery]);

  const activeFiltersCount = [
    activeCategory !== "All",
    activeCity !== "All Cities",
    searchQuery.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setActiveCategory("All");
    setActiveCity("All Cities");
    setSearchQuery("");
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Discover Events</h1>
          <p className="text-text-secondary mt-1">
            Find gatherings that bring your community together
          </p>
        </div>
        <Link
          href="/events/create"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Create Event
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events, topics, or tags..."
          className="w-full pl-12 pr-4 py-3.5 bg-surface rounded-xl border-none outline-none text-foreground placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* City Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl text-sm font-medium hover:bg-elevated transition-colors"
          >
            <MapPin className="w-4 h-4 text-text-secondary" />
            <span>{activeCity}</span>
            <ChevronDown className="w-4 h-4 text-text-tertiary" />
          </button>
          {showCityDropdown && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-elevated rounded-xl shadow-lg border border-surface z-10 py-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setActiveCity("All Cities");
                  setShowCityDropdown(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors ${
                  activeCity === "All Cities" ? "text-primary font-medium" : ""
                }`}
              >
                All Cities
              </button>
              {cities.map((c) => (
                <button
                  key={`${c.city}-${c.country}`}
                  onClick={() => {
                    setActiveCity(`${c.city}, ${c.country}`);
                    setShowCityDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors ${
                    activeCity === `${c.city}, ${c.country}` ? "text-primary font-medium" : ""
                  }`}
                >
                  {c.city}, {c.country}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toggle (Mobile) */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl text-sm font-medium hover:bg-elevated transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary font-medium hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category Chips */}
      <div className={`flex flex-wrap gap-2 mb-8 ${showFilters ? "block" : "hidden md:flex"}`}>
        <CategoryChip
          label="All"
          active={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
        {categories.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">
          {loading ? "Loading..." : `${filteredEvents.length} events found`}
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredEvents.length > 0 ? (
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
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            <Search className="w-8 h-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No events found</h3>
          <p className="text-text-secondary mb-6">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={clearFilters}
            className="text-primary font-medium hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
