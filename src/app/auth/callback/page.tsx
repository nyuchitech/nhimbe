"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleOAuthCallback = useCallback(async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Check for OAuth error
      if (errorParam) {
        setError(errorDescription || "Authentication was cancelled or failed");
        return;
      }

      // Verify we have a code
      if (!code) {
        setError("No authorization code received");
        return;
      }

      // Verify state for CSRF protection
      const storedState = localStorage.getItem("oauth_state");
      if (state !== storedState) {
        setError("Invalid state parameter. Please try signing in again.");
        return;
      }

      // Clear stored state
      localStorage.removeItem("oauth_state");

      // Exchange code for tokens via our backend
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await fetch(`${API_URL}/api/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to exchange authorization code");
      }

      const data = await response.json();

      // Store tokens
      localStorage.setItem("nhimbe_access_token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("nhimbe_refresh_token", data.refresh_token);
      }

      // Refresh user context
      await refreshUser();

      // Get redirect destination
      const redirectTo = localStorage.getItem("auth_redirect") || "/";
      localStorage.removeItem("auth_redirect");

      // Check if user needs onboarding
      if (data.user) {
        localStorage.setItem("nhimbe_user", JSON.stringify(data.user));
        if (!data.user.onboardingCompleted) {
          router.push("/onboarding");
          return;
        }
      }

      // Redirect to intended destination
      router.push(redirectTo);
    } catch (err) {
      console.error("OAuth callback failed:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }, [searchParams, refreshUser, router]);

  useEffect(() => {
    handleOAuthCallback();
  }, [handleOAuthCallback]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Authentication Failed</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
            <Link href="/auth/signin">
              <Button>Try Again</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-xl font-medium mb-2">Signing you in...</h1>
        <p className="text-text-secondary">Please wait a moment</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-medium mb-2">Signing you in...</h1>
            <p className="text-text-secondary">Please wait a moment</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
