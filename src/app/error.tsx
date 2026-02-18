"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <AlertTriangle className="w-12 h-12 text-primary mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-text-secondary mb-6 max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
