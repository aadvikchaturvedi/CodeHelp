import Redis from "ioredis";
import { LruCache } from "./lru";

/**
 * Two cache backends behind one API:
 *  - Redis, when REDIS_URL is set: a TTL cache (SETEX). Eviction is whatever
 *    the Redis server's maxmemory-policy says; this code does not make it LRU.
 *  - Otherwise a per-process, bounded in-memory LRU (see ./lru.ts) that also
 *    honours the TTL. It is not shared between server instances and is lost
 *    on restart.
 */
export const MEMORY_CACHE_MAX_ENTRIES = 200;

const memoryCache = new LruCache<string>(MEMORY_CACHE_MAX_ENTRIES);

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("[Cache] Redis error:", err.message);
    });

    return redisClient;
  } catch {
    return null;
  }
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    const raw = memoryCache.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    try {
      memoryCache.set(key, JSON.stringify(value), ttlSeconds);
    } catch (err) {
      console.error("[Cache] memory set error:", err);
    }
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (err) {
    console.error("[Cache] set error:", err);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    memoryCache.delete(key);
    return;
  }

  try {
    await client.del(key);
  } catch (err) {
    console.error("[Cache] del error:", err);
  }
}

export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const inFlightRequests = new Map<string, Promise<unknown>>();

export async function dedupeRequest<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

export function closeRedis(): void {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
