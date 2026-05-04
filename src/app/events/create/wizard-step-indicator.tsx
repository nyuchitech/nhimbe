"use client";

import { Check } from "lucide-react";

interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3;
  steps: { id: 1 | 2 | 3; label: string }[];
}

export function WizardStepIndicator({ currentStep, steps }: WizardStepIndicatorProps) {
  return (
    <nav
      aria-label="Event creation progress"
      className="flex items-center justify-between mb-6 px-1"
      data-slot="wizard-step-indicator"
    >
      {steps.map((step, idx) => {
        const isComplete = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                aria-current={isActive ? "step" : undefined}
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-[var(--motion-standard)]",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-elevated text-text-tertiary",
                ].join(" ")}
              >
                {isComplete ? <Check className="w-4 h-4" aria-hidden /> : step.id}
              </div>
              <span
                className={[
                  "text-[11px] uppercase tracking-wider",
                  isActive ? "text-primary font-semibold" : "text-text-tertiary",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  "flex-1 h-0.5 mx-2 transition-colors duration-[var(--motion-standard)]",
                  isComplete ? "bg-primary" : "bg-elevated",
                ].join(" ")}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
