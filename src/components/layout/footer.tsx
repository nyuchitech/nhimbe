"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/theme-provider";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  const { resolvedTheme } = useTheme();
  const iconSrc = resolvedTheme === "dark" ? "/nhimbe-icon-dark.png" : "/nhimbe-icon-light.png";

  return (
    <footer className="border-t border-elevated py-12 mt-20">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface border border-elevated flex items-center justify-center overflow-hidden">
            <Image
              src={iconSrc}
              alt="nhimbe"
              width={32}
              height={32}
            />
          </div>
          <span className="text-xl font-bold text-primary">nhimbe</span>
          <span className="font-serif italic text-sm text-text-secondary hidden sm:inline">
            &ldquo;Together we gather, together we grow&rdquo;
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

        {/* Right */}
        <div className="flex items-center gap-6 text-sm text-text-tertiary">
          <ThemeToggle />
          <span>
            A{" "}
            <Link href="https://mukoko.com" className="text-secondary font-semibold hover:underline">
              Mukoko
            </Link>{" "}
            Product
          </span>
          <span>© 2025 Nyuchi Africa</span>
        </div>
      </div>
    </footer>
  );
}
