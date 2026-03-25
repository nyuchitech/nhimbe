"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BottomSheetModal } from "./bottom-sheet-modal";

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
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Capacity">
      <div className="space-y-4">
        <div>
          <Label className="block text-sm text-text-secondary mb-2">Maximum Attendees</Label>
          <Input
            type="number"
            value={capacity || ""}
            onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : null)}
            placeholder="Leave empty for unlimited"
            min={1}
            className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none"
          />
        </div>
        <p className="text-sm text-text-tertiary">Leave empty for unlimited capacity</p>
        <Button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
        >
          Done
        </Button>
      </div>
    </BottomSheetModal>
  );
}
