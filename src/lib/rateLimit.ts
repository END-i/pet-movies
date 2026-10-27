interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed). */
  retryAfter: number;
}

/**
 * Token bucket per client key: `capacity` requests in a burst, refilled at `refillPerSecond`.
 */
export function createRateLimiter(options: {
  capacity: number;
  refillPerSecond: number;
  maxClients?: number;
  now?: () => number;
}) {
  const { capacity, refillPerSecond, maxClients = 10_000, now = Date.now } = options;
  const buckets = new Map<string, Bucket>();

  function refill(bucket: Bucket, at: number): void {
    const elapsed = (at - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
    bucket.updatedAt = at;
  }

  function prune(at: number): void {
    for (const [key, bucket] of buckets) {
      refill(bucket, at);
      if (bucket.tokens >= capacity) buckets.delete(key);
    }
  }

  return {
    take(key: string): RateLimitResult {
      const at = now();
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxClients) prune(at);
        bucket = { tokens: capacity, updatedAt: at };
        buckets.set(key, bucket);
      } else {
        refill(bucket, at);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfter: 0 };
      }
      return { allowed: false, retryAfter: Math.ceil((1 - bucket.tokens) / refillPerSecond) };
    }
  };
}

/**
 * Client IP for rate limiting. Behind a reverse proxy the socket address is the proxy, so the
 * last `X-Forwarded-For` hop (added by our own proxy, not by the client) is used instead.
 */
export function clientKey(headers: Headers, socketAddress: string | undefined): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return socketAddress || 'unknown';
}
