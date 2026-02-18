"use client";

import { AIDescriptionBadge } from "@/components/ui/ai-description-wizard";
import { BottomSheetModal } from "./bottom-sheet-modal";

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  setDescription: (value: string) => void;
  eventName: string;
  category: string;
  isOnline: boolean;
}

export function DescriptionModal({
  isOpen,
  onClose,
  description,
  setDescription,
  eventName,
  category,
  isOnline,
}: DescriptionModalProps) {
  return (
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Description">
      <div className="flex items-center gap-3 -mt-4 mb-4">
        <AIDescriptionBadge
          eventName={eventName}
          category={category}
          isOnline={isOnline}
          onDescriptionGenerated={(desc) => setDescription(desc)}
        />
      </div>
      <div className="space-y-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your event..."
          rows={6}
          className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none resize-none"
        />
        <p className="text-xs text-text-tertiary">
          Tip: Click &quot;Ask Shamwari&quot; to let our AI friend help write your description
        </p>
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
