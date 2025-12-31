"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, useCallback, ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

// Subscribe to localStorage changes for theme
function subscribeToThemeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Get stored theme from localStorage
function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("nhimbe-theme");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

// Subscribe to system theme changes
function subscribeToSystemTheme(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

// Get current system theme
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  // Use useSyncExternalStore for localStorage - React 19 compliant
  const storedTheme = useSyncExternalStore(
    subscribeToThemeStorage,
    getStoredTheme,
    () => defaultTheme // Server snapshot
  );

  // Use useSyncExternalStore for system preference
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "dark" as ResolvedTheme // Server snapshot
  );

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = storedTheme === "system" ? systemTheme : storedTheme;

  // Set theme function - updates localStorage which triggers re-render via useSyncExternalStore
  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem("nhimbe-theme", newTheme);
    // Trigger storage event for useSyncExternalStore to pick up
    window.dispatchEvent(new Event("storage"));
  }, []);

  // Cycle through: dark → light → system → dark
  const cycleTheme = useCallback(() => {
    const currentTheme = getStoredTheme();
    if (currentTheme === "dark") setTheme("light");
    else if (currentTheme === "light") setTheme("system");
    else setTheme("dark");
  }, [setTheme]);

  // Update document class when resolved theme changes
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme: storedTheme, resolvedTheme, setTheme, cycleTheme }}>
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
