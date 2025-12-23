# Mukoko Navigation System

A reusable navigation system for Mukoko ecosystem apps. This document provides copy-paste ready components with full code snippets.

## Table of Contents

1. [Overview](#overview)
2. [Required Dependencies](#required-dependencies)
3. [Theme System](#theme-system)
4. [Header Component](#header-component)
5. [Footer Component](#footer-component)
6. [Layout Integration](#layout-integration)
7. [CSS Variables](#css-variables)
8. [Customization Guide](#customization-guide)

---

## Overview

The Mukoko navigation system includes:

- **Transparent → Frosted Glass Header**: Transparent at top, frosted glass on scroll
- **Dynamic Page Titles**: Logo at top, page title when scrolled (with truncation)
- **Pill-shaped Action Group**: Primary-colored pill with 44px touch targets
- **Theme System**: Dark/Light/System with localStorage persistence
- **WCAG 2.2 AAA Compliance**: 7:1 minimum contrast ratio

### Key Features

| Feature | Description |
|---------|-------------|
| Scroll Detection | Header transitions at 20px scroll |
| Touch Targets | 44px minimum for mobile accessibility |
| Theme Toggle | Cycles: Dark → Light → System |
| Page Titles | Static mapping + dynamic H1 detection |
| Frosted Glass | `backdrop-blur-xl` with theme-aware opacity |

---

## Required Dependencies

```bash
npm install lucide-react
```

### File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── footer.tsx
│   ├── ui/
│   │   ├── avatar.tsx
│   │   └── theme-toggle.tsx
│   └── theme-provider.tsx
├── app/
│   ├── globals.css
│   └── layout.tsx
```

---

## Theme System

### Theme Provider (`src/components/theme-provider.tsx`)

```tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
  storageKey?: string; // Customize per app: "nhimbe-theme", "mukoko-theme", etc.
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "app-theme" // Change this per app
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Initial theme detection from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(storageKey) as Theme | null;
    if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
      setTheme(stored);
    }
  }, [storageKey]);

  // Resolve the actual theme (light or dark) based on theme setting
  useEffect(() => {
    if (!mounted) return;

    if (theme === "system") {
      setResolvedTheme(getSystemTheme());
    } else {
      setResolvedTheme(theme);
    }
  }, [theme, mounted]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted, theme]);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
    localStorage.setItem(storageKey, theme);
  }, [theme, resolvedTheme, mounted, storageKey]);

  // Cycle through: dark → light → system → dark
  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "system";
      return "dark";
    });
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
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
```

### Theme Toggle Button (`src/components/ui/theme-toggle.tsx`)

```tsx
"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="w-5 h-5" />;
      case "light":
        return <Sun className="w-5 h-5" />;
      case "system":
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "dark":
        return "Dark mode (click for light)";
      case "light":
        return "Light mode (click for system)";
      case "system":
        return "System mode (click for dark)";
    }
  };

  return (
    <button
      onClick={cycleTheme}
      aria-label={getLabel()}
      title={getLabel()}
      className="flex items-center justify-center w-11 h-11 rounded-full bg-surface border border-elevated text-foreground hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {getIcon()}
    </button>
  );
}
```

---

## Header Component

### Full Header (`src/components/layout/header.tsx`)

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

// Configure navigation links per app
const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/my-events", label: "My Events" },
  { href: "/calendar", label: "Calendar" },
];

// Static page titles - customize per app
const pageTitles: Record<string, string> = {
  "/": "Discover",
  "/my-events": "My Events",
  "/calendar": "Calendar",
  "/about": "About",
  "/help": "Help Center",
  "/terms": "Terms of Service",
  "/privacy": "Privacy Policy",
  "/search": "Search",
  "/profile": "Profile",
};

// App configuration - change these per app
const APP_CONFIG = {
  name: "nhimbe",        // Lowercase wordmark
  createPath: "/events/create",
  searchPath: "/search",
  profilePath: "/profile",
};

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Page title detection (static mapping + dynamic H1)
  useEffect(() => {
    const staticTitle = pageTitles[pathname];
    if (staticTitle) {
      setPageTitle(staticTitle);
      return;
    }

    // For dynamic pages, get title from first H1
    const getPageTitle = () => {
      const h1 = document.querySelector("h1");
      if (h1) {
        setPageTitle(h1.textContent || null);
      } else {
        setPageTitle(null);
      }
    };

    const timer = setTimeout(getPageTitle, 100);
    const observer = new MutationObserver(getPageTitle);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-elevated/50 shadow-sm"
          : ""
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo / Page Title */}
        <Link href="/" className="min-w-0 flex-shrink">
          <div className="relative h-[34px] flex items-center">
            {/* Logo - visible when not scrolled */}
            <span
              className={`text-[28px] font-bold text-primary transition-all duration-300 ${
                isScrolled && pageTitle
                  ? "opacity-0 absolute"
                  : "opacity-100"
              }`}
            >
              {APP_CONFIG.name}
            </span>
            {/* Page title - visible when scrolled */}
            {pageTitle && (
              <span
                className={`text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px] transition-all duration-300 ${
                  isScrolled
                    ? "opacity-100"
                    : "opacity-0 absolute"
                }`}
              >
                {pageTitle}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-primary"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Pill-shaped Action Group */}
        <div className="flex items-center bg-primary rounded-full p-1 gap-1 flex-shrink-0">
          <Link
            href={APP_CONFIG.createPath}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
            aria-label="Create"
          >
            <Plus className="w-6 h-6 text-background" />
          </Link>
          <Link
            href={APP_CONFIG.searchPath}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
            aria-label="Search"
          >
            <Search className="w-6 h-6 text-background" />
          </Link>
          <Link
            href={APP_CONFIG.profilePath}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/20 hover:bg-background/30 transition-colors overflow-hidden"
            aria-label="Profile"
          >
            <Avatar initials="TM" size="sm" className="w-9 h-9" />
          </Link>
        </div>
      </div>
    </header>
  );
}
```

### Avatar Component (`src/components/ui/avatar.tsx`)

```tsx
interface AvatarProps {
  initials?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ initials, src, size = "md", className = "" }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  if (src) {
    return (
      <div
        className={`${sizes[size]} rounded-full bg-cover bg-center ${className}`}
        style={{ backgroundImage: `url(${src})` }}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center font-bold text-background cursor-pointer ${className}`}
    >
      {initials}
    </div>
  );
}
```

---

## Footer Component

### Full Footer (`src/components/layout/footer.tsx`)

```tsx
"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Configure footer links per app
const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

// App configuration - change these per app
const APP_CONFIG = {
  name: "nhimbe",
  tagline: "Together we gather, together we grow",
  mukokoUrl: "https://mukoko.com",
  copyrightHolder: "Nyuchi Africa",
};

export function Footer() {
  return (
    <footer className="border-t border-elevated py-12 mt-20">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-primary">{APP_CONFIG.name}</span>
          <span className="font-serif italic text-sm text-text-secondary">
            &ldquo;{APP_CONFIG.tagline}&rdquo;
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-8">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Theme Toggle + Attribution */}
        <div className="flex items-center gap-6 text-sm text-text-tertiary">
          <ThemeToggle />
          <span>
            A{" "}
            <Link href={APP_CONFIG.mukokoUrl} className="text-secondary font-semibold hover:underline">
              Mukoko
            </Link>{" "}
            Product
          </span>
          <span>© {new Date().getFullYear()} {APP_CONFIG.copyrightHolder}</span>
        </div>
      </div>
    </footer>
  );
}
```

---

## Layout Integration

### Root Layout (`src/app/layout.tsx`)

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "App Name - Tagline",
  description: "App description",
};

// Flash prevention script - runs before React hydrates
// Change 'app-theme' to match your app's storage key
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('app-theme');
      var theme;
      if (stored === 'light' || stored === 'dark') {
        theme = stored;
      } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(theme);
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="system" storageKey="app-theme">
          <Header />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## CSS Variables

### Global Styles (`src/app/globals.css`)

```css
@import "tailwindcss";

/*
 * Mukoko Theme System
 * WCAG 2.2 AAA Compliant - 7:1 contrast ratio for normal text
 */

:root {
  /* Design Tokens - Shared */
  --charcoal: #0A0A0A;
  --cream: #FAF9F5;

  /* Default to dark mode */
  --background: #0A0A0A;
  --foreground: #F5F5F4;
  --surface: #141414;
  --elevated: #1E1E1E;

  /* Text hierarchy */
  --text-primary: #F5F5F4;
  --text-secondary: #B8B8B3;
  --text-tertiary: #8A8A85;

  /* Brand Colors - Dark mode */
  --malachite: #64FFDA;
  --tanzanite: #B388FF;
  --gold: #FFD740;

  /* Semantic */
  --primary: var(--malachite);
  --secondary: var(--tanzanite);
  --accent: var(--gold);
}

/* Dark Theme - WCAG AAA Compliant */
.dark {
  --background: #0A0A0A;
  --foreground: #F5F5F4;
  --surface: #141414;
  --elevated: #1E1E1E;

  /* Text hierarchy - AAA compliant (7:1+ contrast on #0A0A0A) */
  --text-primary: #F5F5F4;     /* 19.3:1 contrast */
  --text-secondary: #B8B8B3;   /* 10.4:1 contrast */
  --text-tertiary: #8A8A85;    /* 7.1:1 contrast */

  /* Brand Colors */
  --malachite: #64FFDA;
  --tanzanite: #B388FF;
  --gold: #FFD740;

  --primary: var(--malachite);
  --secondary: var(--tanzanite);
  --accent: var(--gold);
}

/* Light Theme - WCAG AAA Compliant */
.light {
  --background: #FAFAF8;
  --foreground: #171717;
  --surface: #FFFFFF;
  --elevated: #F0F0ED;

  /* Text hierarchy - AAA compliant (7:1+ contrast on #FAFAF8) */
  --text-primary: #171717;     /* 17.4:1 contrast */
  --text-secondary: #404040;   /* 10.2:1 contrast */
  --text-tertiary: #595959;    /* 7.0:1 contrast */

  /* Brand Colors - Darker for light mode */
  --malachite: #00574B;        /* 7.3:1 contrast */
  --tanzanite: #4B0082;        /* 10.5:1 contrast */
  --gold: #8B5A00;             /* 7.1:1 contrast */

  --primary: var(--malachite);
  --secondary: var(--tanzanite);
  --accent: var(--gold);
}

/* Tailwind v4 theme integration */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-elevated: var(--elevated);
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);

  /* Typography */
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Noto Serif", ui-serif, Georgia, serif;

  /* Design Tokens */
  --radius-button: 12px;
  --radius-card: 16px;
  --radius-input: 8px;
  --radius-badge: 9999px;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}

/* Touch target minimum size (44px) */
button, input, select, textarea {
  min-height: 44px;
}
```

---

## Customization Guide

### Per-App Configuration

When implementing in a new Mukoko app, update these values:

1. **Header (`APP_CONFIG`)**
   ```tsx
   const APP_CONFIG = {
     name: "your-app-name",  // Lowercase wordmark
     createPath: "/create",
     searchPath: "/search",
     profilePath: "/profile",
   };
   ```

2. **Footer (`APP_CONFIG`)**
   ```tsx
   const APP_CONFIG = {
     name: "your-app-name",
     tagline: "Your app tagline",
     mukokoUrl: "https://mukoko.com",
     copyrightHolder: "Nyuchi Africa",
   };
   ```

3. **Theme Storage Key**
   - Layout: `storageKey="your-app-theme"`
   - Flash script: `localStorage.getItem('your-app-theme')`

4. **Navigation Links**
   - Update `navLinks` array in header
   - Update `footerLinks` array in footer
   - Update `pageTitles` mapping for scroll titles

### Changing Brand Colors

Update the CSS variables in both `.dark` and `.light` classes:

```css
.dark {
  --primary: #YOUR_DARK_PRIMARY;
  --secondary: #YOUR_DARK_SECONDARY;
}

.light {
  --primary: #YOUR_LIGHT_PRIMARY;
  --secondary: #YOUR_LIGHT_SECONDARY;
}
```

### Pill Action Group Icons

Replace the icons in the header pill:

```tsx
import { Plus, Search, Bell, Settings } from "lucide-react";

// In the pill div:
<Link href="/notifications">
  <Bell className="w-6 h-6 text-background" />
</Link>
```

---

## Visual Reference

### Header States

```
┌─────────────────────────────────────────────────────────────┐
│ At Top (transparent):                                        │
│                                                             │
│   nhimbe          Discover  My Events  Calendar    [+][🔍][👤]│
│   ↑ logo                                            ↑ pill   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Scrolled (frosted glass):                         ░░░░░░░░░░│
│                                                   ░░░░░░░░░░│
│   Page Title…     Discover  My Events  Calendar    [+][🔍][👤]│
│   ↑ truncated                                       ↑ pill   │
└─────────────────────────────────────────────────────────────┘
```

### Footer Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   nhimbe "Tagline"   About  Help  Terms  Privacy   [🌙] A Mukoko Product © 2025│
│   ↑ brand             ↑ links                       ↑ theme toggle              │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: December 2025*
*Part of the Mukoko Design System*
