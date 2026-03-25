import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  description?: string;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
  down: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
  neutral: { icon: Minus, color: "text-foreground/40", bg: "bg-foreground/5" },
};

function StatsCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  description,
  className,
}: StatsCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <Card data-slot="stats-card" className={cn("border-0 bg-surface", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-foreground/60">
              {icon && <span className="[&_svg]:size-3.5">{icon}</span>}
              <span data-slot="stats-card-label" className="text-xs font-medium">
                {label}
              </span>
            </div>
            <div data-slot="stats-card-value" className="text-2xl font-bold">
              {value}
            </div>
          </div>
          {trendInfo && trendValue && (
            <div
              data-slot="stats-card-trend"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trendInfo.bg,
                trendInfo.color
              )}
            >
              <trendInfo.icon className="size-3" />
              {trendValue}
            </div>
          )}
        </div>
        {description && (
          <p
            data-slot="stats-card-description"
            className="mt-2 text-xs text-foreground/40"
          >
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { StatsCard };
export type { StatsCardProps };
