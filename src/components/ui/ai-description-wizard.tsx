"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, ArrowLeft, Loader2, RefreshCw, Check, X } from "lucide-react";
import { Button } from "./button";
import {
  generateEventDescription,
  regenerateEventDescription,
  type DescriptionContext,
  type GeneratedDescription,
} from "@/lib/api";

interface WizardStep {
  question: string;
  placeholder: string;
  helpText?: string;
  key: keyof DescriptionContext;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    question: "What type of gathering is this?",
    placeholder: "e.g., workshop, networking mixer, concert, community cleanup, tech talk...",
    helpText: "This helps set the tone and format expectations",
    key: "eventType",
  },
  {
    question: "Who should attend this event?",
    placeholder: "e.g., entrepreneurs, music lovers, families with kids, tech professionals...",
    helpText: "Describe your ideal attendees so the right people find your event",
    key: "targetAudience",
  },
  {
    question: "What will attendees gain or experience?",
    placeholder: "e.g., learn new skills, meet like-minded people, enjoy live music...",
    helpText: "Focus on the value and benefits for attendees",
    key: "keyTakeaways",
  },
  {
    question: "Any special highlights or unique aspects?",
    placeholder: "e.g., guest speaker, free food, networking session, live demo...",
    helpText: "What makes your event stand out? (Optional)",
    key: "highlights",
  },
];

interface AIDescriptionWizardProps {
  eventName: string;
  category: string;
  isOnline: boolean;
  onDescriptionGenerated: (description: string) => void;
  onClose: () => void;
}

export function AIDescriptionWizard({
  eventName,
  category,
  isOnline,
  onDescriptionGenerated,
  onClose,
}: AIDescriptionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedDescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const canProceed = currentStep === WIZARD_STEPS.length - 1 || answers[step.key]?.trim();

  const handleNext = async () => {
    if (isLastStep) {
      await generateDescription();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (generatedResult) {
      setGeneratedResult(null);
      setCurrentStep(WIZARD_STEPS.length - 1);
    } else {
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  };

  const generateDescription = async () => {
    setIsGenerating(true);
    setError(null);

    const context: DescriptionContext = {
      eventName,
      category,
      isOnline,
      eventType: answers.eventType,
      targetAudience: answers.targetAudience,
      keyTakeaways: answers.keyTakeaways,
      highlights: answers.highlights,
    };

    try {
      const result = await generateEventDescription(context);
      setGeneratedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateFeedback.trim()) return;

    setIsGenerating(true);
    setError(null);

    const context: DescriptionContext = {
      eventName,
      category,
      isOnline,
      eventType: answers.eventType,
      targetAudience: answers.targetAudience,
      keyTakeaways: answers.keyTakeaways,
      highlights: answers.highlights,
    };

    try {
      const result = await regenerateEventDescription(context, regenerateFeedback);
      setGeneratedResult(result);
      setShowRegenerateInput(false);
      setRegenerateFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (generatedResult) {
      onDescriptionGenerated(generatedResult.description);
      onClose();
    }
  };

  // Render the result view
  if (generatedResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Shamwari</h3>
                  <p className="text-sm text-text-secondary">Your AI friend created this for you</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-elevated rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Generated description */}
            <div className="bg-surface rounded-xl p-4">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {generatedResult.description}
              </p>
            </div>

            {/* Suggestions */}
            {generatedResult.suggestions && generatedResult.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-text-secondary">Suggestions to improve:</h4>
                <ul className="space-y-1.5">
                  {generatedResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regenerate input */}
            {showRegenerateInput && (
              <div className="space-y-3">
                <textarea
                  value={regenerateFeedback}
                  onChange={(e) => setRegenerateFeedback(e.target.value)}
                  placeholder="Tell me what you'd like to change... (e.g., make it shorter, more formal, add more details about networking)"
                  className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none resize-none h-24 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowRegenerateInput(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRegenerate}
                    disabled={!regenerateFeedback.trim() || isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Regenerating...
                      </>
                    ) : (
                      "Apply Changes"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-elevated flex gap-3">
            <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            {!showRegenerateInput && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowRegenerateInput(true)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Adjust
                </Button>
                <Button onClick={handleAccept} className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Use This
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render wizard steps
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-[600px] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Shamwari</h3>
                <p className="text-sm text-text-secondary">
                  Step {currentStep + 1} of {WIZARD_STEPS.length} - Let me help you
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-elevated rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-lg font-medium mb-2">{step.question}</h4>
            {step.helpText && (
              <p className="text-sm text-text-secondary mb-4">{step.helpText}</p>
            )}
          </div>

          <textarea
            value={answers[step.key] || ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [step.key]: e.target.value }))}
            placeholder={step.placeholder}
            className="w-full px-4 py-3 bg-surface rounded-xl border-none outline-none resize-none h-32"
            autoFocus
          />

          {error && (
            <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-elevated flex gap-3">
          <Button
            variant="ghost"
            onClick={currentStep === 0 ? onClose : handleBack}
            className="flex items-center gap-2"
          >
            {currentStep === 0 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                Back
              </>
            )}
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleNext}
            disabled={!canProceed && currentStep < WIZARD_STEPS.length - 1}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : isLastStep ? (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Description
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Description Badge Button
 * Shows a sparkle badge that opens the AI wizard
 */
interface AIDescriptionBadgeProps {
  eventName: string;
  category: string;
  isOnline: boolean;
  onDescriptionGenerated: (description: string) => void;
}

export function AIDescriptionBadge({
  eventName,
  category,
  isOnline,
  onDescriptionGenerated,
}: AIDescriptionBadgeProps) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowWizard(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-medium transition-colors border border-primary/20"
        title="Ask Shamwari to help write your description"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Ask Shamwari
      </button>

      {showWizard && (
        <AIDescriptionWizard
          eventName={eventName}
          category={category}
          isOnline={isOnline}
          onDescriptionGenerated={onDescriptionGenerated}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
