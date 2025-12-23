"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/my-events", label: "My Events" },
  { href: "/calendar", label: "Calendar" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[28px] font-bold text-primary">
          nhimbe
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
        <div className="flex items-center bg-primary rounded-full p-1 gap-1">
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
            <Avatar initials="TM" size="sm" className="w-9 h-9" />
          </Link>
        </div>
      </div>
    </header>
  );
}
