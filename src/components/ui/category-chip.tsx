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
      className={`px-6 py-3 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 ${
        active
          ? "bg-primary text-primary-foreground border-2 border-primary"
          : "bg-surface text-foreground border-2 border-foreground/20 hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
