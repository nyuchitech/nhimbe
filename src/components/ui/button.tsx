"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "large";
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

    const variants = {
      primary:
        "bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-0.5",
      secondary:
        "bg-surface text-foreground border border-elevated hover:bg-elevated hover:border-foreground/30",
      ghost: "bg-transparent text-foreground hover:bg-surface",
    };

    const sizes = {
      default: "px-5 py-2.5 text-sm",
      large: "px-7 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
