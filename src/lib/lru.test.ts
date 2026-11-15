import { describe, it } from "node:test";
import assert from "node:assert";
import { LruCache } from "./lru";

describe("LruCache", () => {
  it("evicts the least recently used entry at capacity", () => {
    const cache = new LruCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // a is now most recently used
    cache.set("c", 3);
    assert.strictEqual(cache.get("b"), undefined);
    assert.strictEqual(cache.get("a"), 1);
    assert.strictEqual(cache.get("c"), 3);
    assert.strictEqual(cache.size, 2);
  });

  it("refreshes recency on overwrite", () => {
    const cache = new LruCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10);
    cache.set("c", 3);
    assert.deepStrictEqual(cache.keys(), ["a", "c"]);
    assert.strictEqual(cache.get("a"), 10);
  });

  it("expires entries after their TTL", () => {
    let now = 1_000;
    const cache = new LruCache<string>(5, () => now);
    cache.set("k", "v", 10);
    now += 9_999;
    assert.strictEqual(cache.get("k"), "v");
    now += 2;
    assert.strictEqual(cache.get("k"), undefined);
    assert.strictEqual(cache.size, 0);
  });

  it("keeps entries without a TTL", () => {
    let now = 0;
    const cache = new LruCache<string>(1, () => now);
    cache.set("k", "v");
    now += 1e12;
    assert.strictEqual(cache.get("k"), "v");
  });

  it("rejects a non-positive capacity", () => {
    assert.throws(() => new LruCache(0), RangeError);
    assert.throws(() => new LruCache(1.5), RangeError);
  });
});
