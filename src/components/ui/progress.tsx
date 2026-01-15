"use client";

import { forwardRef, HTMLAttributes } from "react";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: "default" | "primary" | "secondary" | "accent";
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, variant = "primary", className = "", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const variants = {
      default: "bg-foreground/50",
      primary: "bg-primary",
      secondary: "bg-secondary",
      accent: "bg-accent",
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full h-2 bg-elevated rounded-full overflow-hidden ${className}`}
        {...props}
      >
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${variants[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";
