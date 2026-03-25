"use client";

import { ReactNode } from "react";

interface FormFieldRowProps {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function FormFieldRow({ icon, onClick, children, className }: FormFieldRowProps) {
  return (
    <button
      data-slot="form-field-row"
      onClick={onClick}
      className={`w-full bg-surface rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-elevated transition-colors mb-2 ${className || ""}`}
    >
      <span className="text-text-secondary">{icon}</span>
      <div className="text-left flex-1">{children}</div>
    </button>
  );
}
