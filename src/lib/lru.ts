/**
 * Bounded in-memory LRU cache with optional per-entry TTL.
 *
 * A Map iterates in insertion order, so the first key is always the least
 * recently used one: reads and writes re-insert the key to mark it as most
 * recently used, and inserts evict from the front once `maxEntries` is hit.
 */
interface Entry<V> {
  value: V;
  /** Epoch ms after which the entry is stale; null = never expires. */
  expiresAt: number | null;
}

export class LruCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(maxEntries: number, now: () => number = Date.now) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError("LruCache maxEntries must be a positive integer");
    }
    this.maxEntries = maxEntries;
    this.now = now;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt !== null && entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Re-insert to mark as most recently used.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlSeconds?: number): void {
    const expiresAt =
      ttlSeconds !== undefined && ttlSeconds > 0
        ? this.now() + ttlSeconds * 1000
        : null;

    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  /** Keys from least to most recently used (stale entries included). */
  keys(): string[] {
    return [...this.entries.keys()];
  }
}
