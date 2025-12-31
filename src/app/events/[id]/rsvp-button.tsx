"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { registerForEvent, trackEventView } from "@/lib/api";

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

  // Track view on mount
  useEffect(() => {
    const userId = localStorage.getItem("nhimbe_user")
      ? JSON.parse(localStorage.getItem("nhimbe_user") || "{}").id
      : undefined;
    trackEventView(eventId, userId);
  }, [eventId]);

  const handleRSVP = async () => {
    // Check if user is logged in
    const userData = localStorage.getItem("nhimbe_user");
    if (!userData) {
      // For now, create a guest registration with a temporary ID
      const guestId = `guest_${Date.now()}`;
      setLoading(true);
      setError(null);

      try {
        await registerForEvent({
          event_id: eventId,
          user_id: guestId,
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
      return;
    }

    // User is logged in
    const user = JSON.parse(userData);
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

  if (registered) {
    return (
      <Button variant="secondary" className="w-full py-4 text-base" disabled>
        ✓ Registered
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
