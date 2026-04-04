/**
 * In-memory sliding window rate limiter.
 * No external dependencies — stores timestamps per key in a Map.
 * Resets on process restart, so use this only for low-stakes best-effort
 * throttling where cross-instance durability is not required.
 */

const store = new Map<string, number[]>();

// Periodic cleanup of expired entries (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, timestamps] of store) {
    // Remove keys with no recent activity (older than 1 hour)
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 3600000) {
      store.delete(key);
    }
  }
}

/**
 * Check and consume a rate limit slot.
 *
 * @param key - Unique identifier (e.g., `generate:${userId}` or `health:${ip}`)
 * @param windowMs - Sliding window duration in milliseconds
 * @param maxRequests - Maximum requests allowed within the window
 * @returns { allowed, remaining } — whether the request should proceed
 */
export function rateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanup(now);

  const timestamps = store.get(key) ?? [];
  const windowStart = now - windowMs;

  // Evict timestamps outside the window
  const valid = timestamps.filter((t) => t > windowStart);

  if (valid.length >= maxRequests) {
    store.set(key, valid);
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  store.set(key, valid);
  return { allowed: true, remaining: maxRequests - valid.length };
}
