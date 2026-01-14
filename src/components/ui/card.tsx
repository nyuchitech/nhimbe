"use client";

import { forwardRef, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const variants = {
      default: "bg-surface",
      elevated: "bg-elevated",
      bordered: "bg-surface border border-elevated",
    };

    return (
      <div
        ref={ref}
        className={`rounded-[var(--radius-card)] ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`p-6 pb-0 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", children, ...props }, ref) => (
    <h3 ref={ref} className={`font-semibold text-lg ${className}`} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", children, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-text-secondary mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 flex items-center ${className}`} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";
