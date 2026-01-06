"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Loading component
function LoadingState() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-medium mb-2">Loading...</h1>
      </div>
    </div>
  );
}

// Dynamically import the onboarding form with no SSR
const OnboardingForm = dynamic(
  () => import("./onboarding-form"),
  {
    ssr: false,
    loading: () => <LoadingState />
  }
);

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OnboardingForm />
    </Suspense>
  );
}
