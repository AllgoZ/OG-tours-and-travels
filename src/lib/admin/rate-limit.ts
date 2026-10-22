/**
 * Best-effort login throttle: a sliding window per key, held in this server process's memory.
 *
 * Honest limits: on serverless hosting each instance has its own memory, so this slows scripted
 * guessing against one instance but is NOT a distributed guarantee. The authoritative protection is
 * Supabase Auth's own rate limiting (Dashboard -> Authentication -> Rate Limits) plus a strong
 * password; see docs/admin-cms.md.
 */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  { max, windowMs, now = Date.now() }: { max: number; windowMs: number; now?: number },
): RateLimitResult {
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= max) {
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - bucket.hits[0])) / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  if (buckets.size > MAX_KEYS) {
    // Opportunistic cleanup so a flood of distinct keys cannot grow memory without bound.
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
