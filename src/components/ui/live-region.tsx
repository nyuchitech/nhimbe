"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type AnnounceFunction = (message: string) => void;

const LiveRegionContext = createContext<AnnounceFunction>(() => {});

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((text: string) => {
    // Clear then set to ensure re-announcement of same message
    setMessage("");
    requestAnimationFrame(() => setMessage(text));
  }, []);

  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useAnnounce(): AnnounceFunction {
  return useContext(LiveRegionContext);
}
