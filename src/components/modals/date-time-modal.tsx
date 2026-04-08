"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventDate: string;
  setEventDate: (value: string) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
}

export function DateTimeModal({
  isOpen,
  onClose,
  eventDate,
  setEventDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
}: DateTimeModalProps) {
  const timeError = endTime && startTime && endTime <= startTime;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} title="Date & Time">
      <div className="space-y-4">
        <div>
          <Label className="block text-sm text-text-secondary mb-2">Date</Label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm text-text-secondary mb-2">Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base"
            />
          </div>
          <div>
            <Label className="block text-sm text-text-secondary mb-2">End Time</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`w-full px-4 py-3 bg-surface rounded-xl border-none outline-none text-base ${timeError ? "ring-2 ring-red-500/50" : ""}`}
            />
          </div>
        </div>
        {timeError && (
          <p className="text-sm text-red-400">End time must be after start time</p>
        )}
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
