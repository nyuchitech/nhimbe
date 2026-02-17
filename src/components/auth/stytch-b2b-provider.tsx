"use client";

import { createStytchB2BHeadlessClient } from "@stytch/nextjs/b2b/headless";
import { StytchB2BProvider as Provider } from "@stytch/nextjs/b2b";
import { ReactNode } from "react";

const stytchB2B = createStytchB2BHeadlessClient(
  process.env.NEXT_PUBLIC_STYTCH_B2B_PUBLIC_TOKEN || ""
);

export function StytchB2BProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_STYTCH_B2B_PUBLIC_TOKEN) {
    // If no B2B token configured, just render children without provider
    return <>{children}</>;
  }

  return <Provider stytch={stytchB2B}>{children}</Provider>;
}
