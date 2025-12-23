"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { StaticGradientBackground } from "./gradient-background";

// Lazy load the heavy Three.js component
const GradientBackground = lazy(() =>
  import("./gradient-background").then((mod) => ({ default: mod.GradientBackground }))
);

interface AnimatedBackgroundProps {
  enableAnimation?: boolean;
  intensity?: number;
  speed?: number;
}

export function AnimatedBackground({
  enableAnimation = true,
  intensity = 0.35,
  speed = 0.4,
}: AnimatedBackgroundProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check for reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // Check for color scheme preference
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(darkQuery.matches ? "dark" : "light");

    const handleThemeChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };
    darkQuery.addEventListener("change", handleThemeChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      darkQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  // Show static background on server or before mount
  if (!mounted) {
    return <StaticGradientBackground theme="dark" />;
  }

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
