"use client";

import { useState } from "react";
import { useStytch } from "@stytch/nextjs";
import { useAuth } from "@/components/auth/auth-context";
import { updateProfile } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NamePromptProps {
  onComplete: () => void;
}

export function NamePrompt({ onComplete }: NamePromptProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const stytch = useStytch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokens = stytch.session.getTokens();
      const sessionJwt = tokens?.session_jwt;
      if (!sessionJwt) throw new Error("No session found");

      await updateProfile(sessionJwt, { name: name.trim() });
      await refreshUser();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Label className="text-sm font-medium text-text-secondary">
        What&apos;s your name?
      </Label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="flex-1 px-4 py-3 bg-surface border border-elevated rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          disabled={loading}
        />
        <Button type="submit" variant="default" disabled={loading || name.trim().length < 2}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
