"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/theme-provider";

const platformLinks = [
  { href: "/events", label: "Discover Events" },
  { href: "/calendar", label: "Calendar" },
  { href: "/search", label: "Search" },
  { href: "/events/create", label: "Create an Event" },
];

const companyLinks = [
  { href: "/about", label: "About nhimbe" },
  { href: "/help", label: "Help Centre" },
  { href: "https://mukoko.com", label: "Mukoko", external: true },
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
  const { resolvedTheme } = useTheme();
  const iconSrc =
    resolvedTheme === "dark"
      ? "/nhimbe-icon-dark.png"
      : "/nhimbe-icon-light.png";

  return (
    <footer className="border-t border-elevated mt-20" role="contentinfo">
      <div className="max-w-300 mx-auto px-6 py-12">
        {/* Top section — brand + link columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-surface border border-elevated flex items-center justify-center overflow-hidden">
                <Image
                  src={iconSrc}
                  alt="nhimbe"
                  width={32}
                  height={32}
                />
              </div>
              <span className="text-xl font-bold text-primary">nhimbe</span>
            </Link>
            <p className="font-serif italic text-sm text-text-secondary leading-relaxed">
              &ldquo;Together we gather, together we grow&rdquo;
            </p>
          </div>

          {/* Platform column */}
          <nav aria-label="Platform">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Platform
            </h3>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company column */}
          <nav aria-label="Company">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  {"external" in link ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-text-secondary hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal column */}
          <nav aria-label="Legal">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar — copyright + theme toggle */}
        <div className="mt-12 pt-8 border-t border-elevated flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-tertiary">
            © {new Date().getFullYear()} Nyuchi Africa. All rights reserved. A{" "}
            <a
              href="https://mukoko.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary font-semibold hover:underline"
            >
              Mukoko
            </a>{" "}
            product.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
