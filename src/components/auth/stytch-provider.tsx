"use client";

import { StytchProvider as StytchProviderSDK, createStytchUIClient } from "@stytch/nextjs";
import { ReactNode } from "react";

// Lazy-initialize Stytch client to avoid build-time errors
let stytchClient: ReturnType<typeof createStytchUIClient> | null = null;

function getStytchClient() {
  if (!stytchClient) {
    const token = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN;
    if (!token) {
      console.error("[mukoko:auth] NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN is not set");
      // Return a placeholder — Stytch SDK handles empty tokens gracefully
      return createStytchUIClient("");
    }
    stytchClient = createStytchUIClient(token);
  }
  return stytchClient;
}

export function StytchProvider({ children }: { children: ReactNode }) {
  return (
    <StytchProviderSDK stytch={getStytchClient()}>{children}</StytchProviderSDK>
  );
}
