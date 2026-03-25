"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile, getCategories, type Category } from "@/lib/api";
import { Button } from "@/components/ui/button";

// sessionStorage so dismissals reset per browser session — prompt reappears next visit
const DISMISS_KEY = "nhimbe_interests_prompt_dismissed";

export function InterestsPrompt() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const stytch = useStytch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  if (!isAuthenticated || (user?.interests && user.interests.length > 0) || dismissed) return null;

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) return;
      await updateProfile(sessionJwt, { interests: selected });
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
    <div className="bg-surface border border-elevated rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium">What interests you?</p>
        </div>
        <button onClick={handleDismiss} className="text-text-tertiary hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.slice(0, 12).map((cat) => (
          <button
            key={cat.id}
            onClick={() => toggleInterest(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              selected.includes(cat.id)
                ? "bg-primary text-background"
                : "bg-elevated text-foreground hover:bg-foreground/10"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <Button
        variant="default"
        onClick={handleSave}
        disabled={selected.length === 0 || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}
