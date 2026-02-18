"use client";

import { Ticket } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "./bottom-sheet-modal";

interface TicketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFree: boolean;
  setIsFree: (value: boolean) => void;
  ticketUrl: string;
  setTicketUrl: (value: string) => void;
}

export function TicketingModal({
  isOpen,
  onClose,
  isFree,
  setIsFree,
  ticketUrl,
  setTicketUrl,
}: TicketingModalProps) {
  return (
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Ticketing">
      <div className="space-y-4">
        {/* Free/Paid Toggle */}
        <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
          <Ticket className="w-5 h-5 text-text-secondary" />
          <span className="flex-1">Free Event</span>
          <Switch
            checked={isFree}
            onCheckedChange={setIsFree}
          />
        </div>

        {/* External Ticket URL (shown for paid events) */}
        {!isFree && (
          <div>
            <label className="block text-sm text-text-secondary mb-2">External Ticket URL</label>
            <input
              type="url"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://tickets.example.com/your-event"
              className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
            />
            <p className="text-xs text-text-tertiary mt-2">
              Link to your external ticketing page (e.g., Eventbrite, Quicket, etc.)
            </p>
          </div>
        )}

        {isFree && (
          <div className="p-4 bg-primary/10 rounded-xl">
            <p className="text-sm text-primary">
              Free events allow guests to RSVP directly on nhimbe. For paid events, toggle off &quot;Free Event&quot; and add a link to your external ticketing provider.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
        >
          Done
        </button>
      </div>
    </BottomSheetModal>
  );
}
