"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readOnly?: boolean;
  size?: "sm" | "default" | "lg";
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "size-3.5",
  default: "size-5",
  lg: "size-7",
};

function Rating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  size = "default",
  showValue = false,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div
      data-slot="rating"
      className={cn("inline-flex items-center gap-1", className)}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={cn(
              "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHoverValue(starValue)}
          >
            <Star
              className={cn(
                sizeMap[size],
                isFilled
                  ? "text-accent fill-accent"
                  : "text-foreground/20"
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span
          data-slot="rating-value"
          className="ml-1 text-sm font-medium text-foreground/60"
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export { Rating };
export type { RatingProps };
