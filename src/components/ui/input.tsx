"use client";

import { forwardRef, InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, className = "", ...props }, ref) => {
    const generatedId = useId();
    const errorId = `${generatedId}-error`;

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full px-4 py-3 rounded-[var(--radius-input)]
            bg-elevated border border-transparent
            text-foreground placeholder:text-text-tertiary
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
            transition-colors
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
