"use client";

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ label, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 border ${
        active
          ? "bg-primary text-background border-primary"
          : "bg-transparent text-foreground/60 border-elevated hover:border-primary hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
