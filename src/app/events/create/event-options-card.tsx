"use client";

import { Ticket, Users, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

interface EventOptionsCardProps {
  isFree: boolean;
  requireApproval: boolean;
  capacity: number | null;
  onRequireApprovalChange: (checked: boolean) => void;
  onOpenTicketing: () => void;
  onOpenCapacity: () => void;
}

export function EventOptionsCard({
  isFree,
  requireApproval,
  capacity,
  onRequireApprovalChange,
  onOpenTicketing,
  onOpenCapacity,
}: EventOptionsCardProps) {
  return (
    <div data-slot="event-options" className="mb-6">
      <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-3">
        Event Options
      </h3>

      <Card className="divide-y divide-elevated border-0 bg-surface">
        {/* Ticketing */}
        <button
          type="button"
          onClick={onOpenTicketing}
          className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors"
        >
          <Ticket className="w-5 h-5 text-text-secondary" />
          <span className="flex-1 text-left">Ticketing</span>
          <span className="text-text-secondary">
            {isFree ? "Free Event" : "Paid (External)"}
          </span>
          <Pencil className="w-4 h-4 text-text-tertiary" />
        </button>

        {/* Require Approval */}
        <label
          htmlFor="require-approval-toggle"
          className="px-4 py-3.5 flex items-center gap-3 cursor-pointer select-none"
        >
          <Users className="w-5 h-5 text-text-secondary" />
          <span className="flex-1">Require Approval</span>
          <Switch
            id="require-approval-toggle"
            checked={requireApproval}
            onCheckedChange={onRequireApprovalChange}
          />
        </label>

        {/* Capacity */}
        <button
          type="button"
          onClick={onOpenCapacity}
          className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors"
        >
          <Users className="w-5 h-5 text-text-secondary" />
          <span className="flex-1 text-left">Capacity</span>
          <span className="text-text-secondary">{capacity || "Unlimited"}</span>
          <Pencil className="w-4 h-4 text-text-tertiary" />
        </button>
      </Card>
    </div>
  );
}
