"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import Image from "next/image";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, signIn } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const handleSignIn = () => {
    // Store redirect destination for after auth
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_redirect", redirectTo);
    }
    signIn();
  };

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

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
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
            Sign in with your Mukoko account to discover events and connect with your community
          </p>
        </div>

        <Button onClick={handleSignIn} className="w-full py-6 text-base">
          Continue with Mukoko
        </Button>

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
          nhimbe is part of the Mukoko ecosystem
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
