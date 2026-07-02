const rateLimitMap = new Map<string, number[]>();

/**
 * Memory-based sliding window rate limiter.
 * Limits checking per key (e.g. "rate_limit:${botId}:${customerId}").
 * Default: 5 messages per 60000ms (1 minute).
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];

  // Filter timestamps outside the sliding window
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    rateLimitMap.set(key, validTimestamps);
    return { allowed: false, remaining: 0 };
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);

  return { allowed: true, remaining: limit - validTimestamps.length };
}
