/**
 * Fetch wrapper with timeout support using AbortController
 */

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds
}

/**
 * Fetch with timeout support
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout (default: 30000ms / 30 seconds)
 * @returns Promise<Response>
 * @throws TimeoutError if the request times out
 * @throws Error for network errors
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // Check if it's an abort error (timeout)
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`);
      }
      // Re-throw with more context for network errors
      throw new Error(`Network error fetching ${url}: ${error.message}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convenience wrapper for JSON API calls with timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Promise<T> - Parsed JSON response
 */
export async function fetchJsonWithTimeout<T = unknown>(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Common timeout values (in milliseconds)
export const timeouts = {
  SHORT: 5000,      // 5 seconds
  DEFAULT: 30000,   // 30 seconds
  LONG: 60000,      // 60 seconds
  GROQ_API: 15000,  // 15 seconds for Groq API
};
