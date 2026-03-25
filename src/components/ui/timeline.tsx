import * as React from "react";
import { cn } from "@/lib/utils";

function Timeline({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline"
      className={cn("relative space-y-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function TimelineItem({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-item"
      className={cn(
        "relative flex gap-4 pb-8 last:pb-0",
        "before:absolute before:left-[11px] before:top-6 before:bottom-0 before:w-px before:bg-foreground/10 last:before:hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type DotColor = "default" | "malachite" | "tanzanite" | "gold" | "destructive";

const dotColors: Record<DotColor, string> = {
  default: "bg-foreground/20 border-foreground/10",
  malachite: "bg-[#64FFDA]/20 border-[#64FFDA]/40",
  tanzanite: "bg-[#B388FF]/20 border-[#B388FF]/40",
  gold: "bg-[#FFD740]/20 border-[#FFD740]/40",
  destructive: "bg-red-500/20 border-red-500/40",
};

function TimelineDot({
  className,
  color = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & { color?: DotColor }) {
  return (
    <div
      data-slot="timeline-dot"
      className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
        dotColors[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function TimelineContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("flex-1 pt-0.5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function TimelineHeading({
  className,
  ...props
}: React.ComponentProps<"h4">) {
  return (
    <h4
      data-slot="timeline-heading"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}

function TimelineDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("mt-1 text-sm text-foreground/60", className)}
      {...props}
    />
  );
}

function TimelineTime({
  className,
  ...props
}: React.ComponentProps<"time">) {
  return (
    <time
      data-slot="timeline-time"
      className={cn("mt-1 block text-xs text-foreground/40", className)}
      {...props}
    />
  );
}

export {
  Timeline,
  TimelineItem,
  TimelineDot,
  TimelineContent,
  TimelineHeading,
  TimelineDescription,
  TimelineTime,
};
