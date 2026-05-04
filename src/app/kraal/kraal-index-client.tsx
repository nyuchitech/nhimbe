"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Flame, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-context";
import { getCirclesForPerson } from "@/lib/supabase/api";
import { t } from "@/lib/i18n";
import type { CircleRow } from "@/lib/supabase/types";

export default function KraalIndexClient() {
  const { user, isAuthenticated } = useAuth();
  const personId = (user as { person_id?: string } | null)?.person_id ?? null;
  // Default to "not loading" — only flip true once we've actually kicked
  // off a fetch in the effect's async callback, which keeps the React 19
  // `set-state-in-effect` rule happy.
  const [loading, setLoading] = useState<boolean>(Boolean(personId));
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    getCirclesForPerson(personId)
      .then((rows) => {
        if (!cancelled) setCircles(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load your kraals");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  return (
    <div className="max-w-300 mx-auto px-6 py-10">
      {/* Savanna hero */}
      <header className="relative overflow-hidden rounded-(--radius-card) p-8 md:p-12 mb-10">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(700px 350px at 0% 100%, color-mix(in srgb, var(--heritage-savanna) 50%, transparent) 0%, transparent 60%), radial-gradient(600px 300px at 100% 0%, color-mix(in srgb, var(--heritage-baobab) 40%, transparent) 0%, transparent 60%), var(--surface)",
          }}
        />
        <p className="font-serif italic text-text-secondary mb-2">{t("brand.tagline")}</p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-3">
          {t("kraal.title")}
        </h1>
        <p className="text-text-secondary max-w-150">{t("kraal.subtitle")}</p>
      </header>

      {!isAuthenticated && (
        <Card className="border-0 bg-surface">
          <CardContent className="p-8 text-center">
            <Flame className="w-10 h-10 mx-auto mb-3 text-primary" aria-hidden />
            <h2 className="font-serif text-xl font-semibold mb-2">Sign in to see your kraals</h2>
            <p className="text-text-secondary mb-5">
              Kraals are private to the people in them. Sign in and we&apos;ll bring you back here.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-5 h-[var(--touch-target-sm)] rounded-full bg-primary text-primary-foreground font-semibold"
            >
              Sign in <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-(--radius-card)" />
          ))}
        </div>
      )}

      {isAuthenticated && !loading && error && (
        <Card className="border-0 bg-surface">
          <CardContent className="p-6">
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && !loading && !error && circles.length === 0 && (
        <Card className="border-0 bg-surface">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-text-secondary" aria-hidden />
            <h2 className="font-serif text-xl font-semibold mb-2">No kraals yet</h2>
            <p className="text-text-secondary mb-5">
              Hosts open a kraal alongside their event so attendees can keep the conversation going. Once you join one, it appears here.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-5 h-[var(--touch-target-sm)] rounded-full bg-primary text-primary-foreground font-semibold"
            >
              Find an event
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && !loading && circles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {circles.map((c) => (
            <Link key={c.id} href={`/kraal/${c.id}`} className="block group">
              <Card className="border-0 bg-surface transition-transform duration-[var(--motion-emphasis)] ease-[var(--easing-spring)] group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-primary-foreground font-bold"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--heritage-savanna), var(--heritage-baobab))",
                      }}
                      aria-hidden
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">{c.name}</h3>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {c.description || c.circle_purpose}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-text-tertiary">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" aria-hidden />
                          {c.member_count ?? 0}
                        </span>
                        {c.linked_event_id && (
                          <span className="inline-flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" aria-hidden />
                            Event kraal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
