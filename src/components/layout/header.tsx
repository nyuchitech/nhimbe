"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navLinks = [
  { href: "/", label: "Discover" },
  { href: "/my-events", label: "My Events" },
  { href: "/calendar", label: "Calendar" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-elevated">
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

        {/* Actions - all items 36px (h-9) height */}
        <div className="flex items-center gap-3">
          <Link href="/events/create">
            <button className="flex items-center justify-center gap-2 h-9 px-4 rounded-[var(--radius-button)] bg-primary text-background font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </Link>
          <ThemeToggle />
          <Avatar initials="TM" />
        </div>
      </div>
    </header>
  );
}
