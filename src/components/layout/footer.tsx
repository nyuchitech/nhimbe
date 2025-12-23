import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-elevated py-12 mt-20">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-primary">nhimbe</span>
          <span className="font-serif italic text-sm text-foreground/60">
            &ldquo;Together we gather, together we grow&rdquo;
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-8">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-6 text-sm text-foreground/60">
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
