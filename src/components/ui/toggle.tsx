"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      pressed = false,
      onPressedChange,
      size = "default",
      variant = "default",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-[var(--radius-input)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: pressed
        ? "bg-primary text-primary-foreground"
        : "bg-transparent hover:bg-surface",
      outline: pressed
        ? "bg-primary text-primary-foreground border border-primary"
        : "bg-transparent border border-elevated hover:bg-surface hover:border-foreground/30",
    };

    const sizes = {
      sm: "h-9 px-2.5 text-xs",
      default: "h-10 px-3 text-sm",
      lg: "h-11 px-5 text-base",
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        data-state={pressed ? "on" : "off"}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        onClick={() => onPressedChange?.(!pressed)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Toggle.displayName = "Toggle";
