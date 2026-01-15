"use client";

import { TrendingUp, Users, MapPin, Clock, Flame, Star, Award } from "lucide-react";

interface TrendingCategory {
  name: string;
  change: number; // percentage change
  events: number;
}

interface PopularVenue {
  name: string;
  city: string;
  eventCount: number;
}

interface PeakTime {
  day: string;
  time: string;
  percentage: number;
}

interface CommunityInsightsProps {
  city?: string;
  trendingCategories?: TrendingCategory[];
  popularVenues?: PopularVenue[];
  peakTimes?: PeakTime[];
  totalEvents?: number;
  totalAttendees?: number;
  className?: string;
}

// Default mock data - in production this would come from API
const defaultTrendingCategories: TrendingCategory[] = [
  { name: "Tech", change: 23, events: 45 },
  { name: "Networking", change: 15, events: 32 },
  { name: "Workshop", change: 8, events: 28 },
];

const defaultPopularVenues: PopularVenue[] = [
  { name: "The Hub", city: "Johannesburg", eventCount: 12 },
  { name: "Innovation Center", city: "Cape Town", eventCount: 9 },
  { name: "Community Hall", city: "Nairobi", eventCount: 7 },
];

const defaultPeakTimes: PeakTime[] = [
  { day: "Wednesday", time: "6-8pm", percentage: 34 },
  { day: "Saturday", time: "2-4pm", percentage: 28 },
  { day: "Thursday", time: "7-9pm", percentage: 22 },
];

export function CommunityInsights({
  city,
  trendingCategories = defaultTrendingCategories,
  popularVenues = defaultPopularVenues,
  peakTimes = defaultPeakTimes,
  totalEvents = 156,
  totalAttendees = 2847,
  className = "",
}: CommunityInsightsProps) {
  return (
    <div className={`bg-surface rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Community Insights</h3>
        {city && (
          <span className="text-sm text-text-secondary ml-auto">
            in {city}
          </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-elevated rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary mb-1">
            <Flame className="w-4 h-4 text-accent" />
            <span className="text-xs">Active Events</span>
          </div>
          <div className="text-2xl font-bold">{totalEvents}</div>
        </div>
        <div className="bg-elevated rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-secondary mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs">Community</span>
          </div>
          <div className="text-2xl font-bold">{totalAttendees.toLocaleString()}</div>
        </div>
      </div>

      {/* Trending Categories */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Trending Categories
        </h4>
        <div className="space-y-2">
          {trendingCategories.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between py-2 px-3 bg-elevated rounded-lg"
            >
              <span className="font-medium">{category.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-tertiary">{category.events} events</span>
                <span className={`text-sm font-semibold flex items-center gap-1 ${
                  category.change > 0 ? "text-green-400" : category.change < 0 ? "text-red-400" : "text-text-tertiary"
                }`}>
                  {category.change > 0 ? "↑" : category.change < 0 ? "↓" : "→"}
                  {Math.abs(category.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peak Times */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Peak Event Times
        </h4>
        <div className="space-y-2">
          {peakTimes.map((time, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{time.day} {time.time}</span>
                  <span className="text-xs text-text-tertiary">{time.percentage}%</span>
                </div>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${time.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Venues */}
      <div>
        <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Popular Venues
        </h4>
        <div className="space-y-2">
          {popularVenues.slice(0, 3).map((venue, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 bg-elevated rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium text-sm">{venue.name}</div>
                  <div className="text-xs text-text-tertiary">{venue.city}</div>
                </div>
              </div>
              <span className="text-sm text-text-secondary">{venue.eventCount} events</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebars
export function CommunityInsightsCompact({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">What&apos;s Trending</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Tech events</span>
          <span className="text-xs text-green-400 font-medium">↑ 23%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Peak time</span>
          <span className="text-xs text-text-secondary">Wed 6-8pm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Hot venue</span>
          <span className="text-xs text-text-secondary">The Hub</span>
        </div>
      </div>
    </div>
  );
}
