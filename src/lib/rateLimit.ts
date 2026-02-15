/**
 * In-memory rate limiter for API routes
 * Uses a sliding window approach with automatic cleanup to prevent memory leaks
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in ms (e.g., 60000 for 1 minute)
  maxRequests: number;   // Max requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 100,      // 100 requests per minute
};

// Store request timestamps for each IP
// Map<IP, timestamp[]>
const requestStore = new Map<string, number[]>();

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup interval if not already running
 */
function ensureCleanupInterval(windowMs: number): void {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      const cutoff = now - windowMs;

      const entries = Array.from(requestStore.entries());
      for (const [ip, timestamps] of entries) {
        // Filter out expired timestamps
        const validTimestamps = timestamps.filter((ts: number) => ts > cutoff);

        if (validTimestamps.length === 0) {
          // Remove the IP entry entirely if no valid timestamps
          requestStore.delete(ip);
        } else if (validTimestamps.length !== timestamps.length) {
          // Update with filtered timestamps
          requestStore.set(ip, validTimestamps);
        }
      }
    }, CLEANUP_INTERVAL_MS);

    // Don't keep the process alive just for cleanup (for serverless environments)
    if (cleanupIntervalId.unref) {
      cleanupIntervalId.unref();
    }
  }
}

/**
 * Get the client IP address from request headers
 * Handles proxies (x-forwarded-for), Vercel, Cloudflare, and direct connections
 */
function getClientIp(request: Request): string {
  const headers = request.headers;

  // Check various headers in order of preference
  // x-forwarded-for is the standard for proxies (Vercel, nginx, etc.)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2, ...
    // The first one is the original client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) {
      return ips[0];
    }
  }

  // Vercel-specific header
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Cloudflare header
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Real IP header (commonly set by nginx)
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (shouldn't happen in production)
  return 'unknown';
}

export interface RateLimitResult {
  success: boolean;      // Whether the request is allowed
  remaining: number;     // Number of requests remaining in the window
  limit: number;         // The maximum number of requests allowed
  reset: number;         // Timestamp when the rate limit window resets
}

/**
 * Check if a request should be rate limited
 *
 * @param request - The incoming request object
 * @param config - Optional rate limit configuration (uses defaults if not provided)
 * @returns RateLimitResult with success status and remaining count
 */
export function rateLimit(
  request: Request,
  config?: Partial<RateLimitConfig>
): RateLimitResult {
  const { windowMs, maxRequests } = { ...defaultConfig, ...config };
  const now = Date.now();
  const windowStart = now - windowMs;

  // Ensure cleanup is running
  ensureCleanupInterval(windowMs);

  // Get client IP
  const ip = getClientIp(request);

  // Get existing timestamps for this IP
  const timestamps = requestStore.get(ip) || [];

  // Filter to only include timestamps within the current window
  const validTimestamps = timestamps.filter(ts => ts > windowStart);

  // Check if over limit
  if (validTimestamps.length >= maxRequests) {
    // Find the oldest timestamp in the window to calculate reset time
    const oldestInWindow = Math.min(...validTimestamps);
    const reset = oldestInWindow + windowMs;

    return {
      success: false,
      remaining: 0,
      limit: maxRequests,
      reset,
    };
  }

  // Add current timestamp and update store
  validTimestamps.push(now);
  requestStore.set(ip, validTimestamps);

  // Calculate remaining requests
  const remaining = maxRequests - validTimestamps.length;

  // Reset time is when the oldest request in the window expires
  const reset = validTimestamps.length > 0
    ? Math.min(...validTimestamps) + windowMs
    : now + windowMs;

  return {
    success: true,
    remaining,
    limit: maxRequests,
    reset,
  };
}

/**
 * Create a rate-limited response (429 Too Many Requests)
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Convenience function to check rate limit and return 429 if exceeded
 * Returns null if the request is allowed, or a 429 Response if rate limited
 */
export function checkRateLimit(
  request: Request,
  config?: Partial<RateLimitConfig>
): Response | null {
  const result = rateLimit(request, config);

  if (!result.success) {
    return rateLimitResponse(result);
  }

  return null;
}

// Export for testing purposes
export function _getRequestStore(): Map<string, number[]> {
  return requestStore;
}

export function _clearRequestStore(): void {
  requestStore.clear();
}
