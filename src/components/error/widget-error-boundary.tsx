"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error(`Widget "${this.props.name || "unknown"}" crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 rounded-xl bg-surface border border-elevated text-center text-sm text-text-secondary">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-text-tertiary" />
          <p>Something went wrong</p>
        </div>
      );
    }
    return this.props.children;
  }
}
