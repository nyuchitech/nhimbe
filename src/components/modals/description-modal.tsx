"use client";

import { AIDescriptionBadge } from "@/components/ui/ai-description-wizard";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-3 mb-4">
        <AIDescriptionBadge
          eventName={eventName}
          category={category}
          isOnline={isOnline}
          onDescriptionGenerated={(desc) => setDescription(desc)}
        />
      </div>
      <div className="space-y-4">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your event..."
          rows={6}
          className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none resize-none text-base"
        />
        <p className="text-xs text-text-tertiary">
          Tip: Click &quot;Ask Shamwari&quot; to let our AI friend help write your description
        </p>
        <div className="pt-2">
          <Button
            onClick={onClose}
            className="w-full py-3 h-12 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Done
          </Button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
