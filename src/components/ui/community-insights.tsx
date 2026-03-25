"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Users, MapPin, Clock, Flame, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { getCommunityStats, type CommunityStats } from "@/lib/api";

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
  className?: string;
}

export function CommunityInsights({
  city,
  className = "",
}: CommunityInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getCommunityStats(city);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch community stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [city]);

  // Transform API data to component format
  const trendingCategories: TrendingCategory[] = stats?.trendingCategories?.map((c) => ({
    name: c.category,
    change: c.change,
    events: c.events,
  })) ?? [];

  const popularVenues: PopularVenue[] = stats?.popularVenues?.map((v) => ({
    name: v.venue,
    city: city || "Various",
    eventCount: v.events,
  })) ?? [];

  // Parse peak time from string
  const peakTimes: PeakTime[] = stats?.peakTime
    ? [{ day: stats.peakTime.split(" ")[0], time: stats.peakTime.split(" ").slice(1).join(" "), percentage: 100 }]
    : [];

  const totalEvents = stats?.totalEvents ?? 0;
  const totalAttendees = stats?.totalAttendees ?? 0;

  if (loading) {
    return (
      <div className={`bg-surface rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Community Insights</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Don't render if there's no data
  if (!stats || (totalEvents === 0 && trendingCategories.length === 0)) {
    return null;
  }

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
        <StatsCard
          label="Active Events"
          value={totalEvents}
          icon={<Flame className="w-4 h-4" />}
          className="bg-elevated border-0"
        />
        <StatsCard
          label="Community"
          value={totalAttendees.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
          className="bg-elevated border-0"
        />
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
export function CommunityInsightsCompact({ city, className = "" }: { city?: string; className?: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getCommunityStats(city);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch community stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [city]);

  const topCategory = stats?.trendingCategories?.[0];
  const topVenue = stats?.popularVenues?.[0];

  if (loading) {
    return (
      <div className={`bg-surface rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">What&apos;s Trending</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Don't render if there's no data
  if (!stats || (!topCategory && !topVenue && !stats.peakTime)) {
    return null;
  }

  return (
    <div className={`bg-surface rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">What&apos;s Trending</span>
      </div>
      <div className="space-y-3">
        {topCategory && (
          <div className="flex items-center justify-between">
            <span className="text-sm">{topCategory.category} events</span>
            <span className={`text-xs font-medium ${
              topCategory.change > 0 ? "text-green-400" : topCategory.change < 0 ? "text-red-400" : "text-text-tertiary"
            }`}>
              {topCategory.change > 0 ? "↑" : topCategory.change < 0 ? "↓" : "→"} {Math.abs(topCategory.change)}%
            </span>
          </div>
        )}
        {stats.peakTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Peak time</span>
            <span className="text-xs text-text-secondary">{stats.peakTime}</span>
          </div>
        )}
        {topVenue && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Hot venue</span>
            <span className="text-xs text-text-secondary">{topVenue.venue}</span>
          </div>
        )}
      </div>
    </div>
  );
}
