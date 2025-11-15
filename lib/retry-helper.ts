/**
 * RETRY HELPER
 *
 * Provides automatic retry logic with exponential backoff for unreliable operations
 *
 * USE CASE:
 * - External API calls (Termii SMS, Paystack)
 * - Network requests that might temporarily fail
 * - Database operations during high load
 *
 * BENEFIT:
 * - 80% of API failures are temporary (< 5 seconds)
 * - Retries fix most issues automatically without user intervention
 * - Exponential backoff prevents overwhelming failing services
 */

export interface RetryOptions {
  maxRetries?: number;        // Default: 3
  initialDelayMs?: number;    // Default: 1000 (1 second)
  maxDelayMs?: number;        // Default: 10000 (10 seconds)
  shouldRetry?: (error: any) => boolean;  // Custom retry logic
  onRetry?: (attempt: number, error: any) => void;  // Logging callback
}

/**
 * Retry a function with exponential backoff
 *
 * Example:
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.termii.com/...'),
 *   { maxRetries: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s...
      const delayMs = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );

      // Notify caller of retry
      if (onRetry) {
        onRetry(attempt, error);
      }

      console.log(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`, error);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Default retry logic:
 * - Retry on network errors
 * - Retry on 5xx server errors
 * - Don't retry on 4xx client errors (bad request, unauthorized, etc.)
 */
function defaultShouldRetry(error: any): boolean {
  // Network errors (timeout, connection refused, etc.)
  if (error.name === 'FetchError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP 5xx errors (server errors - temporary)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit - should retry with backoff)
  if (error.status === 429) {
    return true;
  }

  // Don't retry 4xx errors (client errors - permanent)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // For unknown errors, be conservative and retry
  return true;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry specifically for HTTP fetch calls
 * Automatically parses response and throws on non-OK status
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);

      // Throw error with status for retry logic
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    options
  );
}
