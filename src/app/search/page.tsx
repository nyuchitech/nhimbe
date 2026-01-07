"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Clock, ArrowRight, Loader2, X } from "lucide-react";
import { getEvents, getCategories, type Event, type Category } from "@/lib/api";

export default function SearchPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load data and recent searches
  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsResponse, categoriesData] = await Promise.all([
          getEvents({ limit: 100 }),
          getCategories(),
        ]);
        setEvents(eventsResponse.events);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Load recent searches from localStorage
    const stored = localStorage.getItem("nhimbe-recent-searches");
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("nhimbe-recent-searches", JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("nhimbe-recent-searches");
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.location.city.toLowerCase().includes(query) ||
        e.location.venue.toLowerCase().includes(query) ||
        e.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  const popularCategories = categories.slice(0, 6);

  return (
    <div className="max-w-200 mx-auto px-6 py-8">
      {/* Search Input */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) {
              saveSearch(searchQuery.trim());
            }
          }}
          placeholder="Search events, venues, or categories..."
          autoFocus
          className="w-full pl-14 pr-12 py-4 bg-surface rounded-2xl border-none outline-none text-lg text-foreground placeholder:text-text-tertiary focus:ring-2 focus:ring-primary/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : searchQuery ? (
        /* Search Results */
        <div>
          <p className="text-sm text-text-secondary mb-4">
            {filteredEvents.length} result{filteredEvents.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
          </p>
          {filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  onClick={() => saveSearch(searchQuery)}
                  className="flex items-center gap-4 p-4 bg-surface rounded-xl hover:bg-elevated transition-colors"
                >
                  {/* Event Cover */}
                  <div
                    className="w-16 h-16 rounded-lg shrink-0"
                    style={{
                      background: event.coverImage
                        ? `url(${event.coverImage}) center/cover`
                        : event.coverGradient || "linear-gradient(135deg, #004D40, #64FFDA)",
                    }}
                  />
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {event.date.full}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location.city}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-tertiary" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                <Search className="w-8 h-8 text-text-tertiary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-text-secondary">
                Try different keywords or browse by category
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State - Show Recent & Suggestions */
        <div className="space-y-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider">
                  Recent Searches
                </h2>
                <button
                  onClick={clearRecentSearches}
                  className="text-sm text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => setSearchQuery(search)}
                    className="px-4 py-2 bg-surface rounded-full text-sm hover:bg-elevated transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Browse Categories */}
          <div>
            <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-4">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {popularCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/events?category=${encodeURIComponent(category.id)}`}
                  className="p-4 bg-surface rounded-xl hover:bg-elevated transition-colors text-center"
                >
                  <span className="font-medium">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending Events */}
          <div>
            <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-4">
              Trending Events
            </h2>
            <div className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center gap-4 p-4 bg-surface rounded-xl hover:bg-elevated transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-lg shrink-0"
                    style={{
                      background: event.coverImage
                        ? `url(${event.coverImage}) center/cover`
                        : event.coverGradient || "linear-gradient(135deg, #004D40, #64FFDA)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                    <p className="text-sm text-text-secondary">
                      {event.date.month} {event.date.day} · {event.location.city}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                    {event.category}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
