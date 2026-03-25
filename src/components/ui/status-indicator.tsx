import * as React from "react";
import { cn } from "@/lib/utils";

type StatusType = "online" | "offline" | "busy" | "away" | "live";

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  online: "bg-green-400",
  offline: "bg-foreground/30",
  busy: "bg-red-400",
  away: "bg-yellow-400",
  live: "bg-red-500",
};

const sizeMap = {
  sm: "size-1.5",
  default: "size-2.5",
  lg: "size-3.5",
};

function StatusIndicator({
  status,
  label,
  pulse,
  size = "default",
  className,
}: StatusIndicatorProps) {
  const shouldPulse = pulse ?? (status === "online" || status === "live");

  return (
    <div
      data-slot="status-indicator"
      data-status={status}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="relative inline-flex">
        <span
          data-slot="status-dot"
          className={cn("inline-block rounded-full", sizeMap[size], statusColors[status])}
        />
        {shouldPulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              statusColors[status]
            )}
          />
        )}
      </span>
      {label && (
        <span
          data-slot="status-label"
          className="text-sm font-medium text-foreground/60"
        >
          {label}
        </span>
      )}
    </div>
  );
}

export { StatusIndicator };
export type { StatusIndicatorProps, StatusType };
