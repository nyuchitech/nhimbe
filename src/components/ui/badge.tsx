"use client";

import { forwardRef, HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "outline";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const variants = {
      default: "bg-elevated text-foreground",
      primary: "bg-primary/20 text-primary",
      secondary: "bg-secondary/20 text-secondary",
      accent: "bg-accent/20 text-accent",
      success: "bg-green-500/20 text-green-400",
      warning: "bg-yellow-500/20 text-yellow-400",
      error: "bg-red-500/20 text-red-400",
      outline: "border border-elevated text-text-secondary",
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
