/**
 * Cascading fallback chain for data sources.
 *
 * Tries each provider in order, returning the first successful result.
 * Useful for: cache → API → default patterns.
 *
 * @example
 * const data = await fallbackChain(
 *   () => cache.get("events"),
 *   () => api.fetchEvents(),
 *   () => DEFAULT_EVENTS,
 * );
 */
export async function fallbackChain<T>(
  ...providers: Array<() => T | Promise<T>>
): Promise<T> {
  let lastError: unknown;

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result !== null && result !== undefined) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("All fallback providers failed");
}

/**
 * Synchronous version for non-async chains.
 */
export function fallbackChainSync<T>(
  ...providers: Array<() => T>
): T {
  let lastError: unknown;

  for (const provider of providers) {
    try {
      const result = provider();
      if (result !== null && result !== undefined) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("All fallback providers failed");
}
