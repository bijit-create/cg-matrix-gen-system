// Response Cache — in-memory LRU with TTL

interface CacheEntry {
  value: any;
  expires: number;
  accessedAt: number;
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 100;

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  public hits = 0;
  public misses = 0;

  static hashPrompt(systemPrompt: string, userPayload: string): string {
    const str = systemPrompt + '|||' + userPayload;
    // djb2 hash
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(36);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    entry.accessedAt = Date.now();
    this.hits++;
    return entry.value;
  }

  set(key: string, value: any, ttlMs = DEFAULT_TTL) {
    // LRU eviction
    if (this.cache.size >= MAX_ENTRIES) {
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.accessedAt < oldestTime) {
          oldestTime = v.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expires: Date.now() + ttlMs, accessedAt: Date.now() });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return { size: this.cache.size, hits: this.hits, misses: this.misses, maxEntries: MAX_ENTRIES };
  }
}

export const responseCache = new ResponseCache();

export function hashPrompt(systemPrompt: string, userPayload: string): string {
  return ResponseCache.hashPrompt(systemPrompt, userPayload);
}
