/**
 * Retry with exponential backoff and jitter.
 * Prevents thundering herd by adding randomness to delays.
 */

interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay in ms (doubles each retry) */
  baseDelayMs: number;
  /** Maximum delay in ms */
  maxDelayMs: number;
  /** Predicate to skip retries for certain errors (e.g., 4xx) */
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
};

/**
 * Execute an operation with exponential backoff retry.
 *
 * @example
 * ```ts
 * const result = await withRetry(() => fetchFromApi(), {
 *   maxRetries: 3,
 *   baseDelayMs: 200,
 *   shouldRetry: (err) => !(err instanceof ClientError),
 * });
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, shouldRetry } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;
      if (shouldRetry && !shouldRetry(error)) break;

      // Exponential backoff with jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      console.warn(
        `[mukoko:retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
