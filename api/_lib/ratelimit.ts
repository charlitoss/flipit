import { createHash } from "node:crypto";

/**
 * In-process token buckets.
 *
 * Honest limitation: this is per warm instance, so a distributed or
 * cold-start-heavy attacker slips through. It still stops the overwhelming
 * majority of real abuse, which is one script hammering one endpoint. If that
 * ever stops being true, swap in a durable limiter (Upstash) keyed on the same
 * salted hashes — never on raw IPs or URLs.
 */

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();
const EVICT_AFTER_MS = 10 * 60_000;
let lastSweep = 0;

export function keyOf(salt: string, value: string): string {
  return createHash("sha256").update(`${salt}|${value}`).digest("hex").slice(0, 16);
}

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now - b.last > EVICT_AFTER_MS) buckets.delete(k);
  }
}

/**
 * @returns seconds to wait, or 0 when allowed.
 */
export function take(key: string, capacity: number, refillPerMin: number): number {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  const refill = ((now - b.last) / 60_000) * refillPerMin;
  b.tokens = Math.min(capacity, b.tokens + refill);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return Math.max(1, Math.ceil(((1 - b.tokens) / refillPerMin) * 60));
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return 0;
}
