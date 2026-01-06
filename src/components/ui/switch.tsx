"use client";

import { forwardRef, InputHTMLAttributes } from "react";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  switchSize?: "default" | "sm" | "lg";
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked = false, onCheckedChange, switchSize = "default", className = "", disabled, ...props }, ref) => {
    const sizes = {
      sm: {
        track: "w-9 h-5",
        thumb: "w-4 h-4",
        translate: "translate-x-4",
      },
      default: {
        track: "w-11 h-6",
        thumb: "w-5 h-5",
        translate: "translate-x-5",
      },
      lg: {
        track: "w-14 h-7",
        thumb: "w-6 h-6",
        translate: "translate-x-7",
      },
    };

    const { track, thumb, translate } = sizes[switchSize];

    return (
      <label
        className={`relative inline-flex items-center cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`
            ${track}
            rounded-full
            transition-colors duration-200
            ${checked ? "bg-primary" : "bg-elevated"}
            peer-focus-visible:ring-2
            peer-focus-visible:ring-primary
            peer-focus-visible:ring-offset-2
            peer-focus-visible:ring-offset-background
          `}
        >
          <div
            className={`
              ${thumb}
              absolute top-0.5 left-0.5
              bg-white
              rounded-full
              shadow-sm
              transition-transform duration-200
              ${checked ? translate : "translate-x-0"}
            `}
          />
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";
