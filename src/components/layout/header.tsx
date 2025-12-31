"use client";

import { useState, useEffect } from "react";
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

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get user initials on mount and when storage changes
  useEffect(() => {
    setUserInitials(getUserInitials());

    // Listen for storage changes (e.g., sign out)
    const handleStorageChange = () => {
      setUserInitials(getUserInitials());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Get page title from static mapping or from the page's H1 element
  useEffect(() => {
    const staticTitle = pageTitles[pathname];
    if (staticTitle) {
      setPageTitle(staticTitle);
      return;
    }

    // For dynamic pages, try to get the title from the first H1
    const getPageTitle = () => {
      const h1 = document.querySelector("h1");
      if (h1) {
        setPageTitle(h1.textContent || null);
      } else {
        setPageTitle(null);
      }
    };

    // Wait for content to render
    const timer = setTimeout(getPageTitle, 100);

    // Also observe for H1 changes (for dynamic content)
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
