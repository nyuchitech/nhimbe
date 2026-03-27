"use client";

import { useState, useEffect } from "react";
import { Star, Award, Users, Calendar, TrendingUp, CheckCircle, Shield, Loader2 } from "lucide-react";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { getHostReputation, type HostStats as ApiHostStats } from "@/lib/api";

interface HostStats {
  name: string;
  handle?: string;
  initials: string;
  eventsHosted: number;
  totalAttendees?: number;
  avgAttendance?: number; // percentage
  rating?: number; // out of 5
  reviewCount?: number;
  memberSince?: string;
  badges?: string[];
}

interface HostReputationProps {
  host: HostStats;
  variant?: "full" | "compact" | "inline";
  showRating?: boolean;
  className?: string;
}

// Badge definitions
const BADGES = {
  "trusted-host": { label: "Trusted Host", icon: Shield, color: "text-primary" },
  "community-builder": { label: "Community Builder", icon: Users, color: "text-secondary" },
  "consistent": { label: "Consistent", icon: CheckCircle, color: "text-green-400" },
  "rising-star": { label: "Rising Star", icon: TrendingUp, color: "text-accent" },
  "veteran": { label: "Veteran Host", icon: Award, color: "text-purple-400" },
};

export function HostReputation({
  host,
  variant = "full",
  showRating = true,
  className = "",
}: HostReputationProps) {
  // Rating primitive replaces inline renderStars

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-xs font-bold text-background">
          {host.initials}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{host.name}</span>
          {showRating && host.rating !== undefined && host.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
              <span className="text-sm text-text-secondary">{host.rating.toFixed(1)}</span>
            </div>
          )}
          {host.eventsHosted > 5 && (
            <Badge variant="default">
              Trusted Host
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`bg-surface rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-bold text-background">
            {host.initials}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{host.name}</div>
            {host.handle && (
              <div className="text-sm text-text-secondary">{host.handle}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center p-2 bg-elevated rounded-lg">
            <div className="text-lg font-bold">{host.eventsHosted}</div>
            <div className="text-xs text-text-tertiary">Events</div>
          </div>
          {host.totalAttendees !== undefined && (
            <div className="text-center p-2 bg-elevated rounded-lg">
              <div className="text-lg font-bold">{host.totalAttendees}</div>
              <div className="text-xs text-text-tertiary">Attendees</div>
            </div>
          )}
        </div>

        {showRating && host.rating !== undefined && host.rating > 0 && (
          <div className="flex items-center justify-between">
            <Rating value={host.rating} readOnly />
            <span className="text-sm text-text-secondary">
              {host.reviewCount || 0} reviews
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-surface rounded-2xl p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-lg font-bold text-background">
          {host.initials}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{host.name}</h3>
          {host.handle && (
            <div className="text-sm text-text-secondary">{host.handle}</div>
          )}
          {host.memberSince && (
            <div className="text-xs text-text-tertiary mt-1">
              Member since {host.memberSince}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - only show stats that have data */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-elevated rounded-xl">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
          <div className="text-xl font-bold">{host.eventsHosted}</div>
          <div className="text-xs text-text-tertiary">Events Hosted</div>
        </div>
        {host.totalAttendees !== undefined && (
          <div className="text-center p-3 bg-elevated rounded-xl">
            <Users className="w-5 h-5 mx-auto mb-1 text-secondary" />
            <div className="text-xl font-bold">{host.totalAttendees}</div>
            <div className="text-xs text-text-tertiary">Total Attendees</div>
          </div>
        )}
        {host.avgAttendance !== undefined && (
          <div className="text-center p-3 bg-elevated rounded-xl">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-accent" />
            <div className="text-xl font-bold">{host.avgAttendance}%</div>
            <div className="text-xs text-text-tertiary">Avg Attendance</div>
          </div>
        )}
      </div>

      {/* Rating Section */}
      {showRating && host.rating !== undefined && host.rating > 0 && (
        <div className="flex items-center justify-between py-4 border-t border-elevated mb-4">
          <div className="flex items-center gap-3">
            <Rating value={host.rating} readOnly />
            <span className="text-lg font-bold">{host.rating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-text-secondary">
            {host.reviewCount || 0} reviews
          </span>
        </div>
      )}

      {/* Badges */}
      {host.badges && host.badges.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-text-secondary">Badges</h4>
          <div className="flex flex-wrap gap-2">
            {host.badges.map((badgeKey) => {
              const badge = BADGES[badgeKey as keyof typeof BADGES];
              if (!badge) return null;
              const Icon = badge.icon;
              return (
                <div
                  key={badgeKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated rounded-full"
                >
                  <Icon className={`w-4 h-4 ${badge.color}`} />
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple badge display for event cards
export function TrustedHostBadge({ className = "" }: { className?: string }) {
  return (
    <Badge variant="default" className={`flex items-center gap-1 ${className}`}>
      <Shield className="w-3 h-3" />
      Trusted
    </Badge>
  );
}

// Wrapper component that fetches host data from API
export function HostReputationFetch({
  userId,
  variant = "full",
  showRating = true,
  className = "",
}: {
  userId: string;
  variant?: "full" | "compact" | "inline";
  showRating?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [hostStats, setHostStats] = useState<ApiHostStats | null>(null);

  useEffect(() => {
    async function fetchHost() {
      try {
        const data = await getHostReputation(userId);
        setHostStats(data);
      } catch (error) {
        console.error("Failed to fetch host reputation:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHost();
  }, [userId]);

  if (loading) {
    return (
      <div className={`bg-surface rounded-xl p-6 flex items-center justify-center ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hostStats) {
    return null;
  }

  const host: HostStats = {
    name: hostStats.name,
    handle: hostStats.handle,
    initials: hostStats.initials,
    eventsHosted: hostStats.eventsHosted,
    totalAttendees: hostStats.totalAttendees,
    avgAttendance: hostStats.avgAttendance,
    rating: hostStats.rating,
    reviewCount: hostStats.reviewCount,
    badges: hostStats.badges,
  };

  return (
    <HostReputation
      host={host}
      variant={variant}
      showRating={showRating}
      className={className}
    />
  );
}
