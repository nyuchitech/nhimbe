"use client";

import { useState } from "react";
import { Loader2, Monitor, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmKioskPairing } from "@/lib/api";

interface PairKioskProps {
  eventId: string;
}

export function PairKiosk({ eventId }: PairKioskProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePair = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Enter a 6-character code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await confirmKioskPairing(trimmed, eventId);
      setSuccess(result.eventName);
      setCode("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes("expired")
            ? "Code expired. Generate a new one on the kiosk."
            : err.message.includes("already")
              ? "Code already used."
              : "Pairing failed. Try again."
          : "Pairing failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-surface rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Kiosk Paired!</h3>
        <p className="text-sm text-text-secondary">
          The kiosk screen is now connected to <strong>{success}</strong>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => setSuccess(null)}
        >
          Pair another
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Pair Check-In Kiosk</h3>
          <p className="text-xs text-text-tertiary">Enter the code shown on the kiosk screen</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().slice(0, 6));
            setError(null);
          }}
          placeholder="6-digit code"
          className="font-mono text-lg tracking-widest text-center uppercase"
          maxLength={6}
          onKeyDown={(e) => e.key === "Enter" && handlePair()}
        />
        <Button onClick={handlePair} disabled={loading || code.length < 6}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pair"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
