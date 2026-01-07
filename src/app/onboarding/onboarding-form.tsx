"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { getCities, getCategories, type Category } from "@/lib/api";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  MapPin,
  Sparkles,
  Check,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface OnboardingData {
  name: string;
  city: string;
  country: string;
  interests: string[];
}

export default function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    city: "",
    country: "",
    interests: [],
  });
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [authLoading, isAuthenticated, router]);

  // Pre-fill name from user if available
  useEffect(() => {
    if (user?.name && !data.name) {
      setData((prev) => ({
        ...prev,
        name: user.name,
      }));
    }
  }, [user, data.name]);

  // Load cities and categories
  useEffect(() => {
    Promise.all([getCities(), getCategories()])
      .then(([citiesData, categoriesData]) => {
        setCities(citiesData);
        setCategories(categoriesData);
      })
      .catch(console.error);
  }, []);

  const steps = [
    {
      title: "Welcome to nhimbe",
      subtitle: "Let's get to know you",
      icon: User,
    },
    {
      title: "Where are you based?",
      subtitle: "Find events near you",
      icon: MapPin,
    },
    {
      title: "What interests you?",
      subtitle: "We'll personalize your experience",
      icon: Sparkles,
    },
  ];

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.name.trim().length >= 2;
      case 1:
        return data.city && data.country;
      case 2:
        return data.interests.length >= 1;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const toggleInterest = (category: string) => {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(category)
        ? prev.interests.filter((i) => i !== category)
        : [...prev.interests, category],
    }));
  };

  const selectCity = (city: string, country: string) => {
    setData((prev) => ({ ...prev, city, country }));
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("nhimbe_access_token");
      if (!accessToken) {
        throw new Error("No session found");
      }

      const response = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          country: data.country,
          interests: data.interests,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to complete onboarding");
      }

      // Refresh auth context to get updated user
      await refreshUser();

      // Redirect to home
      router.push("/");
    } catch (err) {
      console.error("Onboarding failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const currentStep = steps[step];

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-medium mb-2">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-primary" : "bg-elevated"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <currentStep.icon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">{currentStep.title}</h1>
          <p className="text-text-secondary">{currentStep.subtitle}</p>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="What should we call you?"
                  className="w-full px-4 py-3 bg-surface rounded-xl border border-elevated focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  autoFocus
                />
              </div>
              <p className="text-sm text-text-secondary">
                This is how you&apos;ll appear to other attendees and hosts.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 max-h-75 overflow-y-auto">
              {cities.map((loc) => (
                <button
                  key={`${loc.city}-${loc.country}`}
                  onClick={() => selectCity(loc.city, loc.country)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    data.city === loc.city && data.country === loc.country
                      ? "bg-primary/20 border border-primary"
                      : "bg-surface border border-elevated hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-text-secondary" />
                    <div className="text-left">
                      <div className="font-medium">{loc.city}</div>
                      <div className="text-sm text-text-secondary">{loc.country}</div>
                    </div>
                  </div>
                  {data.city === loc.city && data.country === loc.country && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary mb-4">
                Select at least one category that interests you
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleInterest(category.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      data.interests.includes(category.id)
                        ? "bg-primary text-background"
                        : "bg-surface border border-elevated hover:border-primary/50"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={handleNext} disabled={!canProceed() || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Setting up...
              </>
            ) : step === steps.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
