"use client";

import { Eye, TrendingUp, Flame, Zap, Users } from "lucide-react";

interface PopularityBadgeProps {
  views?: number;
  trend?: number; // percentage change
  isHot?: boolean;
  variant?: "default" | "compact" | "minimal";
  className?: string;
}

export function PopularityBadge({
  views = 0,
  trend = 0,
  isHot = false,
  variant = "default",
  className = "",
}: PopularityBadgeProps) {
  const formatViews = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-1 text-text-tertiary ${className}`}>
        <Eye className="w-3 h-3" />
        <span className="text-xs">{formatViews(views)}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1 text-text-secondary">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{formatViews(views)}</span>
        </div>
        {trend > 10 && (
          <div className="flex items-center gap-0.5 text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium">+{trend}%</span>
          </div>
        )}
        {isHot && (
          <Flame className="w-3.5 h-3.5 text-accent" />
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated rounded-full">
        <Eye className="w-3.5 h-3.5 text-text-secondary" />
        <span className="text-xs font-medium">{formatViews(views)} views</span>
      </div>
      {trend > 10 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-semibold">+{trend}%</span>
        </div>
      )}
      {isHot && (
        <div className="flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded-full">
          <Flame className="w-3 h-3" />
          <span className="text-xs font-semibold">Hot</span>
        </div>
      )}
    </div>
  );
}

// Trending indicator for lists
export function TrendingIndicator({
  rank,
  trend,
  className = "",
}: {
  rank?: number;
  trend?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {rank && rank <= 3 && (
        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
          rank === 1 ? "bg-accent/20 text-accent" :
          rank === 2 ? "bg-gray-300/20 text-gray-300" :
          "bg-amber-600/20 text-amber-600"
        }`}>
          <span className="text-xs font-bold">#{rank}</span>
        </div>
      )}
      {trend && trend > 0 && (
        <div className="flex items-center gap-0.5 text-green-400">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-medium">+{trend}%</span>
        </div>
      )}
    </div>
  );
}

// Event momentum indicator
export function MomentumBadge({
  recentRSVPs,
  totalSpots,
  spotsLeft,
  className = "",
}: {
  recentRSVPs?: number;
  totalSpots?: number;
  spotsLeft?: number;
  className?: string;
}) {
  const isAlmostFull = spotsLeft !== undefined && totalSpots !== undefined && spotsLeft < totalSpots * 0.2;
  const hasRecentActivity = recentRSVPs !== undefined && recentRSVPs > 5;

  if (!isAlmostFull && !hasRecentActivity) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {hasRecentActivity && (
        <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full">
          <Zap className="w-3 h-3" />
          <span className="text-xs font-medium">+{recentRSVPs} this week</span>
        </div>
      )}
      {isAlmostFull && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">Only {spotsLeft} left</span>
        </div>
      )}
    </div>
  );
}
