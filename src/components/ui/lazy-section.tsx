"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * TikTok-style sequential mounting with FIFO queue.
 * Mounts children only when visible and within the global mount budget.
 */

const MOUNT_BUDGET = 3;
const mountQueue: Array<() => void> = typeof window !== "undefined" ? [] : [];
let activeCount = 0;

function requestMount(cb: () => void) {
  if (typeof window === "undefined") {
    cb();
    return;
  }
  if (activeCount < MOUNT_BUDGET) {
    activeCount++;
    cb();
  } else {
    mountQueue.push(cb);
  }
}

function releaseMount() {
  if (typeof window === "undefined") return;
  activeCount = Math.max(0, activeCount - 1);
  const next = mountQueue.shift();
  if (next) {
    activeCount++;
    next();
  }
}

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  unmountOnHide?: boolean;
  className?: string;
}

function LazySection({
  children,
  fallback,
  rootMargin = "200px",
  threshold = 0.1,
  unmountOnHide = false,
  className,
}: LazySectionProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !mounted) {
          requestMount(() => setMounted(true));
          setVisible(true);
        } else if (!entry.isIntersecting && unmountOnHide && mounted) {
          setVisible(false);
          setMounted(false);
          releaseMount();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (mounted) releaseMount();
    };
  }, [mounted, rootMargin, threshold, unmountOnHide]);

  const showContent = mounted && (visible || !unmountOnHide);

  return (
    <div
      ref={ref}
      data-slot="lazy-section"
      data-mounted={mounted}
      className={cn(className)}
    >
      {showContent
        ? children
        : fallback ?? <Skeleton className="h-48 w-full rounded-2xl" />}
    </div>
  );
}

export { LazySection };
export type { LazySectionProps };
