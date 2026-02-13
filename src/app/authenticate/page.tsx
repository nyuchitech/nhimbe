"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStytch, useStytchUser, useStytchSession } from "@stytch/nextjs";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SESSION_DURATION_MINUTES = 10080; // 7 days

function AuthenticateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stytch = useStytch();
  const { user: stytchUser, isInitialized: userInit } = useStytchUser();
  const { session, isInitialized: sessionInit } = useStytchSession();

  const [error, setError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const redirectToDestination = useCallback(() => {
    const savedRedirect =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_redirect")
        : null;
    if (savedRedirect) {
      localStorage.removeItem("auth_redirect");
      router.push(savedRedirect);
    } else {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (userInit && sessionInit && stytchUser && session) {
      redirectToDestination();
      return;
    }

    if (!userInit || !sessionInit) return;
    if (authenticating) return;

    const token = searchParams.get("token");
    const tokenType = searchParams.get("stytch_token_type");

    if (!token || !tokenType) {
      // No token params — if user is authenticated redirect, otherwise show error
      if (!stytchUser || !session) {
        setError("No authentication token found. Please try signing in again.");
      }
      return;
    }

    const authenticate = async () => {
      setAuthenticating(true);
      try {
        if (tokenType === "magic_links") {
          await stytch.magicLinks.authenticate(token, {
            session_duration_minutes: SESSION_DURATION_MINUTES,
          });
        } else if (tokenType === "oauth") {
          await stytch.oauth.authenticate(token, {
            session_duration_minutes: SESSION_DURATION_MINUTES,
          });
        } else {
          setError(`Unsupported authentication method: ${tokenType}`);
          return;
        }
        // Stytch hooks will update, and the effect above will redirect
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Authentication failed";
        setError(message);
      } finally {
        setAuthenticating(false);
      }
    };

    authenticate();
  }, [
    searchParams,
    stytch,
    stytchUser,
    session,
    userInit,
    sessionInit,
    authenticating,
    redirectToDestination,
  ]);

  // Redirect once authentication completes (hooks update)
  useEffect(() => {
    if (userInit && sessionInit && stytchUser && session && !authenticating) {
      redirectToDestination();
    }
  }, [
    stytchUser,
    session,
    userInit,
    sessionInit,
    authenticating,
    redirectToDestination,
  ]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">
            Authentication Failed
          </h1>
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
        <p className="text-text-secondary">Authenticating...</p>
      </div>
    </div>
  );
}

export default function AuthenticatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthenticateContent />
    </Suspense>
  );
}
