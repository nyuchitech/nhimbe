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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [options.length]);

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
    <div data-slot="filter-bar-wrapper" className={cn("relative", className)}>
      {/* Left fade */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}
      {/* Right fade */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      )}
      <div
        ref={scrollRef}
        data-slot="filter-bar"
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1"
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
    </div>
  );
}

export { FilterBar };
export type { FilterBarProps, FilterOption };
