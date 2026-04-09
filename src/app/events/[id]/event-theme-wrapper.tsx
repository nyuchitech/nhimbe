"use client";

import { ReactNode } from "react";
import { mineralThemes } from "@/lib/themes";

export { mineralThemes };

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
      className="min-h-dvh event-themed-page"
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
