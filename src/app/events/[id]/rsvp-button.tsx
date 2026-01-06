"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { registerForEvent, trackEventView } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-context";
import { LogIn } from "lucide-react";

interface RSVPButtonProps {
  eventId: string;
  price?: {
    amount: number;
    currency: string;
    label: string;
  };
}

export function RSVPButton({ eventId, price }: RSVPButtonProps) {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Track view on mount
  useEffect(() => {
    trackEventView(eventId, user?.id);
  }, [eventId, user?.id]);

  const handleRSVP = async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerForEvent({
        event_id: eventId,
        user_id: user.id,
        ticket_type: price ? "paid" : "free",
        ticket_price: price?.amount,
        ticket_currency: price?.currency,
      });
      setRegistered(true);
    } catch (err) {
      setError("Failed to register. Please try again.");
      console.error("RSVP error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <Button variant="secondary" className="w-full py-4 text-base" disabled>
        Loading...
      </Button>
    );
  }

  // Show sign in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Link href={`/auth/signin?redirect=${encodeURIComponent(pathname)}`}>
        <Button variant="primary" className="w-full py-4 text-base">
          <LogIn className="w-5 h-5 mr-2" />
          Sign in to RSVP
        </Button>
      </Link>
    );
  }

  if (registered) {
    return (
      <Button variant="secondary" className="w-full py-4 text-base" disabled>
        Registered
      </Button>
    );
  }

  return (
    <div>
      <Button
        variant="primary"
        className="w-full py-4 text-base"
        onClick={handleRSVP}
        disabled={loading}
      >
        {loading ? "Registering..." : price ? "Get Tickets" : "RSVP Now"}
      </Button>
      {error && (
        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
