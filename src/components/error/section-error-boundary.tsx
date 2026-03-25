"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { trackError } from "@/lib/observability";

interface Props {
  children: ReactNode;
  section: string;
  fallback?: ReactNode;
  onError?: (error: Error, section: string) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Section-level error boundary (Mukoko 3-layer model).
 * Every page section gets one. Shows section name, retry button,
 * and logs errors via observability system.
 *
 * "A crashing chart never takes down the whole page."
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    trackError(error, {
      module: "error-boundary",
      data: { section: this.props.section },
    });
    this.props.onError?.(error, this.props.section);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={`p-6 rounded-xl bg-surface border border-elevated text-center ${this.props.className || ""}`}
          data-slot="section-error-boundary"
        >
          <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-text-tertiary" />
          <p className="text-sm font-medium text-text-primary mb-1">
            {this.props.section} failed to load
          </p>
          <p className="text-xs text-text-secondary mb-4">
            Something went wrong in this section.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                       bg-elevated hover:bg-hover text-text-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
