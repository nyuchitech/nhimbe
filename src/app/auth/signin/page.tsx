"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useStytchUser, useStytchSession, StytchLogin } from "@stytch/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
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
  const { user: stytchUser, isInitialized: userInit } = useStytchUser();
  const { session, isInitialized: sessionInit } = useStytchSession();
  const { resolvedTheme } = useTheme();

  const redirectTo = searchParams.get("redirect") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (userInit && sessionInit && stytchUser && session) {
      router.push(redirectTo);
    }
  }, [stytchUser, session, userInit, sessionInit, router, redirectTo]);

  const isLoading = !userInit || !sessionInit;

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

  if (stytchUser && session) {
    return null;
  }

  const stytchStyles = getStytchStyles(resolvedTheme);

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
            Sign in or create an account to discover events and connect with
            your community
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          }
        >
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
        </Suspense>

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
