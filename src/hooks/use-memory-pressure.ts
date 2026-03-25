"use client";

import * as React from "react";

type PressureState = "nominal" | "fair" | "serious" | "critical";

interface MemoryPressureResult {
  pressure: PressureState;
  isUnderPressure: boolean;
}

/**
 * Monitors device memory pressure via the Performance Observer API.
 * Falls back to navigator.deviceMemory heuristic when unavailable.
 * Useful for deciding whether to mount heavy sections (e.g., with LazySection).
 */
function useMemoryPressure(): MemoryPressureResult {
  const [pressure, setPressure] = React.useState<PressureState>("nominal");

  React.useEffect(() => {
    // Try Pressure Observer API (Chrome 125+)
    if ("PressureObserver" in window) {
      try {
        const observer = new (window as unknown as { PressureObserver: new (cb: (records: Array<{ state: PressureState }>) => void, opts: { sampleInterval: number }) => { observe: (source: string) => void; disconnect: () => void } }).PressureObserver(
          (records: Array<{ state: PressureState }>) => {
            const latest = records[records.length - 1];
            if (latest) setPressure(latest.state);
          },
          { sampleInterval: 2000 }
        );
        observer.observe("cpu");
        return () => observer.disconnect();
      } catch {
        // Pressure Observer not supported for this source
      }
    }

    // Fallback: check navigator.deviceMemory (Chrome/Edge)
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory !== undefined) {
      if (nav.deviceMemory <= 2) setPressure("serious");
      else if (nav.deviceMemory <= 4) setPressure("fair");
      else setPressure("nominal");
    }
  }, []);

  return {
    pressure,
    isUnderPressure: pressure === "serious" || pressure === "critical",
  };
}

export { useMemoryPressure };
export type { PressureState, MemoryPressureResult };
