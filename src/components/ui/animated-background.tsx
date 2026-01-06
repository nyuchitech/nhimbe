"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";
import { StaticGradientBackground } from "./gradient-background";
import { useTheme } from "@/components/theme-provider";

// Lazy load the heavy Three.js component
const GradientBackground = lazy(() =>
  import("./gradient-background").then((mod) => ({ default: mod.GradientBackground }))
);

interface AnimatedBackgroundProps {
  enableAnimation?: boolean;
  intensity?: number;
  speed?: number;
}

// Subscribe to reduced motion preference changes
function subscribeToMotionPreference(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

// Get current reduced motion preference
function getMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Check if we're mounted (client-side)
function subscribeToMount() {
  return () => {};
}

function getIsMounted(): boolean {
  return typeof window !== "undefined";
}

// Inner component that uses the theme context
function AnimatedBackgroundInner({
  enableAnimation = true,
  intensity = 0.2, // Reduced for better text contrast - WCAG AAA
  speed = 0.4,
}: AnimatedBackgroundProps) {
  const { resolvedTheme } = useTheme();

  // Use useSyncExternalStore for reduced motion preference - React 19 compliant
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    () => false // Server snapshot
  );

  // Use static background if animation is disabled or user prefers reduced motion
  if (!enableAnimation || prefersReducedMotion) {
    return <StaticGradientBackground theme={resolvedTheme} />;
  }

  return (
    <>
      <Suspense fallback={<StaticGradientBackground theme={resolvedTheme} />}>
        <GradientBackground theme={resolvedTheme} intensity={intensity} speed={speed} />
      </Suspense>
      {/* Frosted glass overlay */}
      <div
        className="fixed inset-0 -z-9 pointer-events-none backdrop-blur-[1px]"
        style={{
          background: resolvedTheme === "dark"
            ? "rgba(10, 10, 10, 0.3)"
            : "rgba(250, 250, 248, 0.4)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

// Wrapper that handles SSR and mounting
export function AnimatedBackground(props: AnimatedBackgroundProps) {
  // Use useSyncExternalStore to detect client-side mounting
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getIsMounted,
    () => false // Server snapshot
  );

  // Show static background on server or before mount
  if (!mounted) {
    return <StaticGradientBackground theme="dark" />;
  }

  return <AnimatedBackgroundInner {...props} />;
}
