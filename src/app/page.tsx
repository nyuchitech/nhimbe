"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, Loader2, ArrowRight, Globe, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, CloudFog, CloudSun, TrendingUp, Flame, Clock, Users } from "lucide-react";
import { EventCardHorizontal } from "@/components/ui/event-card-horizontal";
import { CommunityInsightsCompact } from "@/components/ui/community-insights";
import { getEvents, getCategories, getPlaceInfo, type Event, type Category } from "@/lib/api";
import { websiteJsonLd, eventsListToJsonLd } from "@/lib/schema";
import { getUserTimezone, getCurrentTimeWithTimezone, getWeather, type WeatherData } from "@/lib/timezone";

// Weather icon component
function WeatherIcon({ icon }: { icon: string }) {
  const iconProps = { className: "w-4 h-4" };
  switch (icon) {
    case "cloud": return <Cloud {...iconProps} />;
    case "cloud-rain": return <CloudRain {...iconProps} />;
    case "cloud-lightning": return <CloudLightning {...iconProps} />;
    case "cloud-snow": return <CloudSnow {...iconProps} />;
    case "cloud-fog": return <CloudFog {...iconProps} />;
    case "cloud-sun": return <CloudSun {...iconProps} />;
    default: return <Sun {...iconProps} />;
  }
}

// Community Stats Bar Component
function CommunityStatsBar({ eventCount }: { eventCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-surface rounded-xl mb-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Flame className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Active Events</div>
          <div className="font-semibold">{eventCount}</div>
        </div>
      </div>
      <div className="h-8 w-px bg-elevated hidden sm:block" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Trending</div>
          <div className="font-semibold text-green-400">Tech +23%</div>
        </div>
      </div>
      <div className="h-8 w-px bg-elevated hidden sm:block" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
          <Clock className="w-4 h-4 text-secondary" />
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Peak Time</div>
          <div className="font-semibold">Wed 6-8pm</div>
        </div>
      </div>
      <div className="h-8 w-px bg-elevated hidden sm:block" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Community</div>
          <div className="font-semibold">2.8K members</div>
        </div>
      </div>
      <Link
        href="/insights"
        className="ml-auto text-xs text-primary font-medium hover:underline hidden md:block"
      >
        View all insights →
      </Link>
    </div>
  );
}

export default function DiscoverPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Detect user location, timezone, and weather on mount
  useEffect(() => {
    // Set current time with timezone
    setCurrentTime(getCurrentTimeWithTimezone());

    // Use timezone city as location hint and fetch weather
    const tz = getUserTimezone();
    if (tz.city) {
      setDetectedCity(tz.city);
      // Fetch weather for the detected city
      getWeather(tz.city).then(setWeather);
    }
  }, []);

  // Fetch events and categories on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsResponse, categoriesData] = await Promise.all([
          getEvents({ limit: 50 }),
          getCategories(),
        ]);

        setEvents(eventsResponse.events);
        setCategories(categoriesData);

        // Set initial city filter based on detected location or first available city
        if (!activeCity && eventsResponse.events.length > 0) {
          const cities = new Set(eventsResponse.events.map((e) => getPlaceInfo(e).city));
          if (detectedCity && cities.has(detectedCity)) {
            setActiveCity(detectedCity);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeCity, detectedCity]);

  // Get unique cities from events
  const availableCities = useMemo(() => {
    const citySet = new Set(events.map((e) => getPlaceInfo(e).city));
    return Array.from(citySet).sort();
  }, [events]);

  // Set default city once available
  useEffect(() => {
    if (!activeCity && availableCities.length > 0) {
      // Prefer detected city, otherwise first available
      if (detectedCity && availableCities.includes(detectedCity)) {
        setActiveCity(detectedCity);
      } else {
        setActiveCity(availableCities[0]);
      }
    }
  }, [availableCities, activeCity, detectedCity]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const categoryMatch = activeCategory === "All" || e.category === activeCategory;
      const cityMatch = !activeCity || getPlaceInfo(e).city === activeCity;
      return categoryMatch && cityMatch;
    });
  }, [events, activeCategory, activeCity]);

  // Split events into two columns for display
  const leftColumnEvents = filteredEvents.filter((_, i) => i % 2 === 0).slice(0, 3);
  const rightColumnEvents = filteredEvents.filter((_, i) => i % 2 === 1).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      {filteredEvents.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsListToJsonLd(filteredEvents.slice(0, 20))) }}
        />
      )}
    <div className="min-h-screen">
      {/* Timezone & Weather Bar */}
      {currentTime && (
        <div className="border-b border-elevated/50">
          <div className="max-w-300 mx-auto px-6 py-2 flex items-center justify-end gap-4 text-sm text-text-tertiary">
            {weather && (
              <div className="flex items-center gap-2">
                <WeatherIcon icon={weather.icon} />
                <span>{weather.temp}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-300 mx-auto px-6">
          <p className="font-serif italic text-lg text-text-secondary mb-4">
            &ldquo;Together we gather, together we grow&rdquo;
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Discover <span className="text-primary">gatherings</span>
            <br />
            that move you
          </h1>
          <p className="text-lg text-text-secondary max-w-150 mb-8">
            From tech meetups to cultural celebrations, find events that bring your community together. Powered by Ubuntu philosophy.
          </p>
          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm"
          >
            Create Your First Event
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Popular Events Section */}
      <section className="pb-16">
        <div className="max-w-300 mx-auto px-6">
          {/* Community Stats Bar - Open Data */}
          <CommunityStatsBar eventCount={filteredEvents.length} />

          {/* Section Header with City Selector */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Popular Events</h2>

              {/* City Dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-foreground transition-colors"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{activeCity || "All Cities"}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showCityDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCityDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-surface rounded-xl shadow-xl border border-elevated py-2 min-w-50 z-50">
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

            <Link
              href="/events"
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground font-medium transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === "All"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-foreground hover:bg-elevated"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground hover:bg-elevated"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Events Grid - Two Columns like Luma */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
              {/* Main Events Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                {/* Left Column */}
                <div className="space-y-2">
                  {leftColumnEvents.map((event) => (
                    <EventCardHorizontal
                      key={event._id}
                      _id={event._id}
                      name={event.name}
                      dateDisplay={event.dateDisplay}
                      location={getPlaceInfo(event)}
                      image={event.image}
                      coverGradient={event.coverGradient}
                    />
                  ))}
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {rightColumnEvents.map((event) => (
                    <EventCardHorizontal
                      key={event._id}
                      _id={event._id}
                      name={event.name}
                      dateDisplay={event.dateDisplay}
                      location={getPlaceInfo(event)}
                      image={event.image}
                      coverGradient={event.coverGradient}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar - Community Insights */}
              <aside className="hidden lg:block">
                <CommunityInsightsCompact />

                {/* Open Data Philosophy */}
                <div className="mt-4 p-4 bg-surface rounded-xl border border-elevated">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Open Data
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    We believe in transparency. View counts, ratings, and community insights are visible to everyone - not locked away for hosts only.
                  </p>
                  <Link
                    href="/about"
                    className="text-xs text-primary font-medium mt-2 inline-block hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              </aside>
            </div>
          ) : (
            <div className="text-center py-16 text-text-secondary">
              <p className="text-lg">No events found in {activeCity}.</p>
              <p className="text-sm mt-2 text-text-tertiary">
                Try selecting a different city or category.
              </p>
            </div>
          )}

          {/* View All Link at bottom */}
          {filteredEvents.length > 6 && (
            <div className="mt-8 text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                View all {filteredEvents.length} events
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-elevated">
        <div className="max-w-300 mx-auto px-6 text-center">
          <p className="font-serif italic text-lg text-text-secondary mb-4">
            &ldquo;Together we gather, together we grow&rdquo;
          </p>
          <h2 className="text-2xl font-bold mb-3">Bring people together</h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Whether it&apos;s a birthday, a workshop, or a community gathering - create something meaningful.
          </p>
          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Create Your First Event
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-text-tertiary mt-8">
            A <span className="text-secondary font-semibold">Mukoko</span> Product
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
