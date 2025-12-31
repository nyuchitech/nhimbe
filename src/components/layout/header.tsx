"use client";

import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search, User } from "lucide-react";

const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/my-events", label: "My Events" },
  { href: "/calendar", label: "Calendar" },
];

// Get user initials from localStorage or return null for guest
function getUserInitials(): string | null {
  if (typeof window === "undefined") return null;
  const userData = localStorage.getItem("nhimbe_user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.name) {
        return user.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Static page titles mapping
const pageTitles: Record<string, string> = {
  "/": "Discover",
  "/my-events": "My Events",
  "/calendar": "Calendar",
  "/about": "About",
  "/help": "Help Center",
  "/terms": "Terms of Service",
  "/privacy": "Privacy Policy",
  "/events/create": "Create Event",
  "/search": "Search",
  "/profile": "Profile",
};

// Subscribe to storage changes for useSyncExternalStore
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Create a subscription for H1 element changes
function createH1Subscription(pathname: string) {
  return function subscribeToH1(callback: () => void) {
    // Check static title first - no subscription needed
    if (pageTitles[pathname]) {
      return () => {};
    }

    // For dynamic pages, observe DOM changes
    const observer = new MutationObserver(callback);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also trigger after a delay for initial render
    const timer = setTimeout(callback, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  };
}

function getPageTitleSnapshot(pathname: string): string | null {
  // Check static mapping first
  const staticTitle = pageTitles[pathname];
  if (staticTitle) return staticTitle;

  // For dynamic pages, get from H1
  if (typeof window === "undefined") return null;
  const h1 = document.querySelector("h1");
  return h1?.textContent || null;
}

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  // Use useSyncExternalStore for localStorage - React 19 compliant
  const userInitials = useSyncExternalStore(
    subscribeToStorage,
    getUserInitials,
    () => null // Server snapshot
  );

  // Memoize the subscription function based on pathname
  const subscribeToH1 = useMemo(() => createH1Subscription(pathname), [pathname]);

  // Get page title snapshot
  const getSnapshot = useMemo(() => () => getPageTitleSnapshot(pathname), [pathname]);

  // Use useSyncExternalStore for page title - React 19 compliant
  const pageTitle = useSyncExternalStore(
    subscribeToH1,
    getSnapshot,
    () => pageTitles[pathname] || null // Server snapshot
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              nhimbe
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

        {/* Nav Links */}
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

        {/* Actions - pill-shaped icon group with 44px touch targets */}
        <div className="flex items-center bg-primary rounded-full p-1 gap-1 flex-shrink-0">
          <Link
            href="/events/create"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
            aria-label="Create event"
          >
            <Plus className="w-6 h-6 text-background" />
          </Link>
          <Link
            href="/search"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/10 hover:bg-background/20 transition-colors"
            aria-label="Search events"
          >
            <Search className="w-6 h-6 text-background" />
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-background/20 hover:bg-background/30 transition-colors overflow-hidden"
            aria-label="Profile"
          >
            {userInitials ? (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-background">
                {userInitials}
              </div>
            ) : (
              <User className="w-5 h-5 text-background" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
