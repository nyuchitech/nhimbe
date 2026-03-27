"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/ui/event-card";
import { CityDropdown } from "@/components/ui/city-dropdown";
import { getEvents, getCategories, getCities, type Event, type Category } from "@/lib/api";
import { LocationPrompt } from "@/components/prompts/location-prompt";
import { InterestsPrompt } from "@/components/prompts/interests-prompt";

interface EventsClientProps {
  initialEvents: Event[];
  initialCategories: Category[];
  initialCities: { addressLocality: string; addressCountry: string }[];
}

export function EventsClient({ initialEvents, initialCategories, initialCities }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [cities, setCities] = useState<{ addressLocality: string; addressCountry: string }[]>(initialCities);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCity, setActiveCity] = useState("All Cities");
  const [showFilters, setShowFilters] = useState(false);

  // Only fetch client-side if no initial data was provided (fallback)
  useEffect(() => {
    if (initialEvents.length > 0) return;

    async function fetchData() {
      setLoading(true);
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
  }, [initialEvents.length]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Match category by ID (new format) or name (legacy)
      const categoryMatch = activeCategory === "All" || e.category === activeCategory;
      const cityMatch =
        activeCity === "All Cities" ||
        `${e.location.addressLocality}, ${e.location.addressCountry}` === activeCity;
      const searchMatch =
        !searchQuery ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.keywords || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
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
    <div className="max-w-300 mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Discover Events</h1>
          <p className="text-text-secondary mt-1">
            Find gatherings that bring your community together
          </p>
        </div>
        <Button asChild>
          <Link href="/events/create">
            Create Event
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events, topics, or tags..."
          className="w-full pl-12 pr-4 py-3.5 bg-surface rounded-xl border-none outline-none text-foreground placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/50"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground h-auto min-h-0 p-1"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Location Prompt */}
      <LocationPrompt />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* City Dropdown */}
        <CityDropdown
          value={activeCity}
          onChange={setActiveCity}
          cities={cities.map((c) => ({
            value: `${c.addressLocality}, ${c.addressCountry}`,
            label: `${c.addressLocality}, ${c.addressCountry}`,
          }))}
          allOption={{ value: "All Cities", label: "All Cities" }}
          variant="filled"
        />

        {/* Filter Toggle (Mobile) */}
        <Button
          variant="ghost"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-surface rounded-xl text-sm font-medium hover:bg-elevated transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge>{activeFiltersCount}</Badge>
          )}
        </Button>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm text-primary font-medium hover:underline h-auto min-h-0 p-0"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Category Filter — horizontal scroll */}
      <div className={`mb-8 ${showFilters ? "block" : "hidden md:block"}`}>
        <FilterBar
          options={categories.map((c) => ({ id: c.id, label: c.name }))}
          selected={activeCategory === "All" ? [] : [activeCategory]}
          onChange={(sel) => setActiveCategory(sel.length > 0 ? sel[0] : "All")}
          mode="single"
          showAll
        />
      </div>

      {/* Interests Prompt */}
      <InterestsPrompt />

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
              title={event.name}
              date={event.date}
              location={event.location}
              category={event.category}
              coverImage={event.image}
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
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-primary font-medium hover:underline"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}
