"use client";

import { useState, useEffect } from "react";
import { createTrackedLink, getTrackedUrl } from "@/lib/api";

/**
 * Hook to create and cache a tracked link for an external URL.
 * Returns the nhimbe redirect URL (/r/[code]) that tracks clicks.
 * Falls back to the raw URL if link creation fails.
 */
export function useTrackedLink(
  targetUrl: string | undefined,
  eventId: string,
  linkType: "meeting_url" | "directions" | "ticket" | "website",
  createdBy?: string
): string | undefined {
  const [trackedUrl, setTrackedUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!targetUrl) return;

    let cancelled = false;

    createTrackedLink({ targetUrl, eventId, linkType, createdBy })
      .then((result) => {
        if (!cancelled) {
          setTrackedUrl(getTrackedUrl(result.code));
        }
      })
      .catch(() => {
        // Fall back to raw URL if tracking fails
        if (!cancelled) {
          setTrackedUrl(targetUrl);
        }
      });

    return () => { cancelled = true; };
  }, [targetUrl, eventId, linkType, createdBy]);

  return trackedUrl;
}
