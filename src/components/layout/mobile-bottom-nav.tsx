"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Ticket, User } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";

const mobileNavItems = [
  { href: "/", label: "Discover", icon: Home },
  { href: "/my-events", label: "My Events", icon: Ticket },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Hide on pages that have their own fixed bottom bars or are full-screen
  const hiddenPaths = ["/events/create", "/signage", "/kiosk", "/admin"];
  const shouldHide = hiddenPaths.some((p) => pathname.startsWith(p))
    || pathname.includes("/manage");

  if (shouldHide) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-elevated md:hidden pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="flex items-center justify-around px-2 h-14">
        {mobileNavItems.map((item) => {
          // For profile, redirect to sign-in if not authenticated
          const href =
            item.href === "/profile" && !isAuthenticated
              ? `/auth/signin?redirect=${encodeURIComponent(pathname)}`
              : item.href;

          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-text-tertiary hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
