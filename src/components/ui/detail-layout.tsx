import * as React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DetailLayoutProps {
  backHref: string;
  backLabel?: string;
  heroImage?: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function DetailLayout({
  backHref,
  backLabel = "Back",
  heroImage,
  sidebar,
  actions,
  metadata,
  children,
  className,
}: DetailLayoutProps) {
  return (
    <div
      data-slot="detail-layout"
      className={cn("max-w-250 mx-auto px-6 py-10", className)}
    >
      <Link
        href={backHref}
        data-slot="detail-layout-back"
        className="inline-flex items-center gap-2 text-foreground/60 text-sm hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4.5 h-4.5" />
        {backLabel}
      </Link>

      {heroImage && (
        <div data-slot="detail-layout-hero" className="mb-8">
          {heroImage}
        </div>
      )}

      {(metadata || actions) && (
        <div
          data-slot="detail-layout-meta"
          className="flex items-center justify-between mb-6"
        >
          {metadata && <div>{metadata}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
        <div data-slot="detail-layout-content">{children}</div>
        {sidebar && (
          <aside
            data-slot="detail-layout-sidebar"
            className="lg:sticky lg:top-25 self-start space-y-6"
          >
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}

export { DetailLayout };
export type { DetailLayoutProps };
