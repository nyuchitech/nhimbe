"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-[var(--radius-input)]
            bg-elevated border border-transparent
            text-foreground placeholder:text-text-tertiary
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
            transition-colors resize-none
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
