"use client";

import { ReactNode } from "react";

// Mineral theme definitions with full color palettes
export const mineralThemes = {
  malachite: {
    name: "Malachite",
    gradient: "linear-gradient(135deg, #004D40 0%, #00796B 50%, #64FFDA 100%)",
    primary: "#64FFDA",
    secondary: "#00796B",
    accent: "#004D40",
    surface: "rgba(0, 77, 64, 0.15)",
    surfaceHover: "rgba(0, 77, 64, 0.25)",
  },
  tanzanite: {
    name: "Tanzanite",
    gradient: "linear-gradient(135deg, #1A0A2E 0%, #4B0082 50%, #B388FF 100%)",
    primary: "#B388FF",
    secondary: "#4B0082",
    accent: "#1A0A2E",
    surface: "rgba(75, 0, 130, 0.15)",
    surfaceHover: "rgba(75, 0, 130, 0.25)",
  },
  gold: {
    name: "Gold",
    gradient: "linear-gradient(135deg, #5D4037 0%, #8B5A00 50%, #FFD740 100%)",
    primary: "#FFD740",
    secondary: "#8B5A00",
    accent: "#5D4037",
    surface: "rgba(139, 90, 0, 0.15)",
    surfaceHover: "rgba(139, 90, 0, 0.25)",
  },
  "tigers-eye": {
    name: "Tiger's Eye",
    gradient: "linear-gradient(135deg, #4A2C00 0%, #8B4513 50%, #D4A574 100%)",
    primary: "#D4A574",
    secondary: "#8B4513",
    accent: "#4A2C00",
    surface: "rgba(139, 69, 19, 0.15)",
    surfaceHover: "rgba(139, 69, 19, 0.25)",
  },
  obsidian: {
    name: "Obsidian",
    gradient: "linear-gradient(135deg, #0A0A0A 0%, #1E1E1E 50%, #3A3A3A 100%)",
    primary: "#9CA3AF",
    secondary: "#3A3A3A",
    accent: "#1E1E1E",
    surface: "rgba(58, 58, 58, 0.15)",
    surfaceHover: "rgba(58, 58, 58, 0.25)",
  },
};

// Extract theme ID from gradient string
function getThemeFromGradient(gradient?: string): keyof typeof mineralThemes {
  if (!gradient) return "malachite";

  if (gradient.includes("#64FFDA") || gradient.includes("#004D40")) return "malachite";
  if (gradient.includes("#B388FF") || gradient.includes("#4B0082")) return "tanzanite";
  if (gradient.includes("#FFD740") || gradient.includes("#8B5A00")) return "gold";
  if (gradient.includes("#D4A574") || gradient.includes("#8B4513")) return "tigers-eye";
  if (gradient.includes("#3A3A3A") || gradient.includes("#1E1E1E")) return "obsidian";

  return "malachite";
}

interface EventThemeWrapperProps {
  children: ReactNode;
  coverGradient?: string;
  themeId?: string;
}

export function EventThemeWrapper({ children, coverGradient, themeId }: EventThemeWrapperProps) {
  const resolvedThemeId = themeId || getThemeFromGradient(coverGradient);
  const theme = mineralThemes[resolvedThemeId as keyof typeof mineralThemes] || mineralThemes.malachite;

  return (
    <div
      className="min-h-screen event-themed-page"
      style={{
        "--event-primary": theme.primary,
        "--event-secondary": theme.secondary,
        "--event-accent": theme.accent,
        "--event-surface": theme.surface,
        "--event-surface-hover": theme.surfaceHover,
        "--event-gradient": theme.gradient,
      } as React.CSSProperties}
    >
      {/* Subtle gradient overlay at top */}
      <div
        className="fixed top-0 left-0 right-0 h-75 pointer-events-none opacity-10 -z-5"
        style={{
          background: `linear-gradient(to bottom, ${theme.accent}, transparent)`,
        }}
      />
      {children}
    </div>
  );
}

// Export the theme getter for use elsewhere
export { getThemeFromGradient };
