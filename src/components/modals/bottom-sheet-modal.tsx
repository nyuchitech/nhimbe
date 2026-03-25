"use client";

import { ReactNode } from "react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheetModal({ isOpen, onClose, title, children }: BottomSheetModalProps) {
  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
    >
      {children}
    </ResponsiveModal>
  );
}
