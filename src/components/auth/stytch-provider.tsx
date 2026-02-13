"use client";

import { StytchProvider as StytchProviderSDK } from "@stytch/nextjs";
import { createStytchUIClient } from "@stytch/nextjs/ui";
import { ReactNode } from "react";

const stytchClient = createStytchUIClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || ""
);

export function StytchProvider({ children }: { children: ReactNode }) {
  return (
    <StytchProviderSDK stytch={stytchClient}>{children}</StytchProviderSDK>
  );
}
