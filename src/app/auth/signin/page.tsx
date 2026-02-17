"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
<<<<<<< Updated upstream
import { ArrowLeft, Loader2 } from "lucide-react";
=======
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
>>>>>>> Stashed changes
import Link from "next/link";
import { useStytchUser, useStytchSession, StytchLogin } from "@stytch/nextjs";
import { Products, OTPMethods } from "@stytch/vanilla-js";
import type { StyleConfig } from "@stytch/vanilla-js";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";

function getStytchStyles(resolvedTheme: "light" | "dark"): StyleConfig {
  const isDark = resolvedTheme === "dark";

  return {
    container: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      width: "100%",
    },
    colors: {
      primary: isDark ? "#64FFDA" : "#00574B",
      secondary: isDark ? "#B388FF" : "#4B0082",
      success: isDark ? "#64FFDA" : "#00574B",
      error: "#FF5252",
    },
    buttons: {
      primary: {
        backgroundColor: isDark ? "#64FFDA" : "#00574B",
        textColor: isDark ? "#0A0A0A" : "#FFFFFF",
        borderColor: isDark ? "#64FFDA" : "#00574B",
        borderRadius: "12px",
      },
      secondary: {
        backgroundColor: isDark ? "#1A1A1A" : "#F0F0ED",
        textColor: isDark ? "#F5F5F4" : "#171717",
        borderColor: isDark ? "#333333" : "#E0E0E0",
        borderRadius: "12px",
      },
    },
    inputs: {
      backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
      borderColor: isDark ? "#333333" : "#E0E0E0",
      borderRadius: "8px",
      textColor: isDark ? "#FFFFFF" : "#171717",
      placeholderColor: isDark ? "#8A8A85" : "#595959",
    },
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    hideHeaderText: false,
  };
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
<<<<<<< Updated upstream
  const { user: stytchUser, isInitialized: userInit } = useStytchUser();
  const { session, isInitialized: sessionInit } = useStytchSession();
  const { resolvedTheme } = useTheme();
=======
  const { isAuthenticated, isLoading } = useAuth();
>>>>>>> Stashed changes

  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (userInit && sessionInit && stytchUser && session) {
      router.push(redirectTo);
    }
  }, [stytchUser, session, userInit, sessionInit, router, redirectTo]);

<<<<<<< Updated upstream
  const isLoading = !userInit || !sessionInit;
=======
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSending(true);

    try {
      // Store redirect destination for after auth
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_redirect", redirectTo);
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };
>>>>>>> Stashed changes

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

<<<<<<< Updated upstream
  if (stytchUser && session) {
    return null;
  }

  const stytchStyles = getStytchStyles(resolvedTheme);

=======
  // Success state - magic link sent
  if (isSent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
          <p className="text-text-secondary mb-2">
            We sent a sign-in link to
          </p>
          <p className="text-foreground font-medium mb-6">{email}</p>
          <p className="text-sm text-text-secondary mb-8">
            Click the link in your email to sign in. The link expires in 10 minutes.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setIsSent(false);
              setEmail("");
            }}
            className="w-full"
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

>>>>>>> Stashed changes
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to nhimbe
        </Link>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Image
              src="/nhimbe-icon-light.png"
              alt="nhimbe"
              width={48}
              height={48}
              className="dark:hidden"
            />
            <Image
              src="/nhimbe-icon-dark.png"
              alt="nhimbe"
              width={48}
              height={48}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Welcome to nhimbe</h1>
          <p className="text-text-secondary">
<<<<<<< Updated upstream
            Sign in or create an account to discover events and connect with
            your community
          </p>
        </div>

        <StytchLogin
          config={{
            products: [Products.otp],
            otpOptions: {
              methods: [OTPMethods.Email],
              expirationMinutes: 10,
            },
          }}
          styles={stytchStyles}
        />
=======
            Enter your email to sign in or create an account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="pl-11 py-6 text-base"
                autoComplete="email"
                autoFocus
                disabled={isSending}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full py-6 text-base"
            disabled={isSending || !email.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Sending link...
              </>
            ) : (
              "Continue with email"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-elevated" />
          <span className="text-sm text-text-tertiary">or</span>
          <div className="flex-1 h-px bg-elevated" />
        </div>

        {/* Mukoko ID Sign-in */}
        <Button
          variant="secondary"
          className="w-full py-6 text-base"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.setItem("auth_redirect", redirectTo);
            }
            // Redirect to Mukoko ID SSO login via Stytch B2B
            const connectionId = process.env.NEXT_PUBLIC_MUKOKO_SSO_CONNECTION_ID || "";
            const publicToken = process.env.NEXT_PUBLIC_STYTCH_B2B_PUBLIC_TOKEN || "";
            const redirectUrl = `${window.location.origin}/api/auth/callback/mukoko`;
            const ssoUrl = `https://api.stytch.com/v1/public/sso/start?connection_id=${connectionId}&public_token=${publicToken}&login_redirect_url=${encodeURIComponent(redirectUrl)}&signup_redirect_url=${encodeURIComponent(redirectUrl)}`;
            window.location.href = ssoUrl;
          }}
        >
          Continue with Mukoko ID
        </Button>
>>>>>>> Stashed changes

        <p className="mt-6 text-center text-sm text-text-secondary">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          Powered by Mukoko Identity
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  );
}
