/** Token bucket per key. In a multi-instance deployment this moves to Redis (see ADR-003). */
export class TokenBucket {
  private readonly buckets = new Map<string, { tokens: number; updated: number }>();
  constructor(private readonly capacity: number, private readonly refillPerSec: number, private readonly now = () => Date.now()) {}

  take(key: string): boolean {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, updated: t };
    b.tokens = Math.min(this.capacity, b.tokens + ((t - b.updated) / 1000) * this.refillPerSec);
    b.updated = t;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }
}
