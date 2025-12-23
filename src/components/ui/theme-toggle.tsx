"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-elevated bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${
          isDark
            ? "translate-x-8 bg-charcoal"
            : "translate-x-1 bg-cream"
        }`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-tanzanite" />
        ) : (
          <Sun className="h-3 w-3 text-gold" />
        )}
      </span>
      {/* Background icons */}
      <span className="absolute left-1.5 flex h-4 w-4 items-center justify-center">
        <Sun className={`h-3 w-3 transition-opacity ${isDark ? "opacity-30 text-foreground/40" : "opacity-0"}`} />
      </span>
      <span className="absolute right-1.5 flex h-4 w-4 items-center justify-center">
        <Moon className={`h-3 w-3 transition-opacity ${isDark ? "opacity-0" : "opacity-30 text-foreground/40"}`} />
      </span>
    </button>
  );
}
