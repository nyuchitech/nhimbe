"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

interface CapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  capacity: number | null;
  setCapacity: (value: number | null) => void;
}

export function CapacityModal({
  isOpen,
  onClose,
  capacity,
  setCapacity,
}: CapacityModalProps) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Capacity">
      <div className="space-y-4">
        <div>
          <Label className="block text-sm text-text-secondary mb-2">Maximum Attendees</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={capacity || ""}
            onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : null)}
            placeholder="Leave empty for unlimited"
            min={1}
            className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
          />
        </div>
        <p className="text-sm text-text-tertiary">Leave empty for unlimited capacity</p>
        <div className="pt-2">
          <Button
            onClick={onClose}
            className="w-full py-3 h-12 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
