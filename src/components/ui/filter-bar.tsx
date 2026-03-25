"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  mode?: "single" | "multi";
  showAll?: boolean;
  showClear?: boolean;
  className?: string;
}

function FilterBar({
  options,
  selected,
  onChange,
  mode = "single",
  showAll = true,
  showClear = false,
  className,
}: FilterBarProps) {
  const allSelected = selected.length === 0;

  function handleSelect(id: string) {
    if (mode === "single") {
      onChange(selected.includes(id) ? [] : [id]);
    } else {
      onChange(
        selected.includes(id)
          ? selected.filter((s) => s !== id)
          : [...selected, id]
      );
    }
  }

  return (
    <div
      data-slot="filter-bar"
      className={cn(
        "flex items-center gap-2 overflow-x-auto scrollbar-none py-1",
        className
      )}
    >
      {showAll && (
        <button
          type="button"
          data-slot="filter-chip"
          data-active={allSelected}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            allSelected
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
          )}
          onClick={() => onChange([])}
        >
          All
        </button>
      )}
      {options.map((option) => {
        const isActive = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            data-slot="filter-chip"
            data-active={isActive}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
            )}
            onClick={() => handleSelect(option.id)}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="text-xs opacity-70">{option.count}</span>
            )}
          </button>
        );
      })}
      {showClear && selected.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onChange([])}
          className="shrink-0"
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

export { FilterBar };
export type { FilterBarProps, FilterOption };
