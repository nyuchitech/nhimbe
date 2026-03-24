"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile, getCities } from "@/lib/api";
import { Button } from "@/components/ui/button";

// sessionStorage so dismissals reset per browser session — prompt reappears next visit
const DISMISS_KEY = "nhimbe_location_prompt_dismissed";

export function LocationPrompt() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const stytch = useStytch();
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [selected, setSelected] = useState<{ city: string; country: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    getCities().then(setCities).catch(() => {});
  }, []);

  if (!isAuthenticated || user?.city || dismissed) return null;

  const handleSave = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) return;
      await updateProfile(sessionJwt, { address_locality: selected.city, address_country: selected.country });
      await refreshUser();
    } catch {
      // Silently fail — non-blocking prompt
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <div className="bg-surface border border-elevated rounded-xl p-4 mb-4 flex items-center gap-3">
      <MapPin className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Where are you based?</p>
        <select
          className="mt-1 w-full bg-elevated rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          value={selected ? `${selected.city}|${selected.country}` : ""}
          onChange={(e) => {
            const [city, country] = e.target.value.split("|");
            setSelected({ city, country });
          }}
        >
          <option value="">Select a city</option>
          {cities.map((c) => (
            <option key={`${c.city}-${c.country}`} value={`${c.city}|${c.country}`}>
              {c.city}, {c.country}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={!selected || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
      </Button>
      <button onClick={handleDismiss} className="text-text-tertiary hover:text-foreground p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
