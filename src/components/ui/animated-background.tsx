"use client";

import { useState, useEffect, lazy, Suspense } from "react";
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

// Inner component that uses the theme context
function AnimatedBackgroundInner({
  enableAnimation = true,
  intensity = 0.2, // Reduced for better text contrast - WCAG AAA
  speed = 0.4,
}: AnimatedBackgroundProps) {
  const { theme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Use static background if animation is disabled or user prefers reduced motion
  if (!enableAnimation || prefersReducedMotion) {
    return <StaticGradientBackground theme={theme} />;
  }

  return (
    <Suspense fallback={<StaticGradientBackground theme={theme} />}>
      <GradientBackground theme={theme} intensity={intensity} speed={speed} />
    </Suspense>
  );
}

// Wrapper that handles SSR and mounting
export function AnimatedBackground(props: AnimatedBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show static background on server or before mount
  if (!mounted) {
    return <StaticGradientBackground theme="dark" />;
  }

  return <AnimatedBackgroundInner {...props} />;
}
