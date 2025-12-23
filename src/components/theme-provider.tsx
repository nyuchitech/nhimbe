"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  const [hasUserPreference, setHasUserPreference] = useState(false);

  // Initial theme detection from system or localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("nhimbe-theme") as Theme | null;
    if (stored && (stored === "light" || stored === "dark")) {
      setTheme(stored);
      setHasUserPreference(true);
    } else {
      // Use system preference as default
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  // Listen for system preference changes (only if user hasn't set a preference)
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!hasUserPreference) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted, hasUserPreference]);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);

    // Only save to localStorage if user has made a manual choice
    if (hasUserPreference) {
      localStorage.setItem("nhimbe-theme", theme);
    }
  }, [theme, mounted, hasUserPreference]);

  const toggleTheme = () => {
    setHasUserPreference(true); // User is manually changing theme
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setThemeWithPreference = (newTheme: Theme) => {
    setHasUserPreference(true);
    setTheme(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeWithPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
