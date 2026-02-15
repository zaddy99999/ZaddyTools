/**
 * Shared LRU Cache with TTL support
 * Memory-safe with automatic eviction of oldest entries
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   * Returns undefined if key doesn't exist or has expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache with TTL (time-to-live in milliseconds)
   */
  set(key: string, value: T, ttlMs: number): void {
    // Delete existing key to update its position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries (including expired ones)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries (optional maintenance method)
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      pruned++;
    });

    return pruned;
  }
}

// Singleton instance for use across API routes
// 100 entries should be plenty for API response caching
export const apiCache = new LRUCache(100);

// Cache key generators for consistent key naming
export const cacheKeys = {
  cryptoPrices: () => 'crypto:prices',
  cryptoGlobal: () => 'crypto:global',
  cryptoFlows: (period: string) => `crypto:flows:${period}`,
  cryptoSectors: () => 'crypto:sectors',
  cryptoTvl: () => 'crypto:tvl',
  cryptoChains: () => 'crypto:chains',
};

// Common TTL values (in milliseconds)
export const cacheTTL = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 60 * 1000,     // 1 minute
  LONG: 5 * 60 * 1000,   // 5 minutes
  VERY_LONG: 10 * 60 * 1000, // 10 minutes
};
