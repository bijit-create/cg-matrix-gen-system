// API Key Manager — manages a pool of Gemini API keys with round-robin rotation

interface KeyEntry {
  key: string;
  rateLimitedUntil: number; // timestamp when rate limit expires (0 = not limited)
  totalRequests: number;
}

const STORAGE_KEY = 'geminiApiKeys';
const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60 seconds

class ApiKeyManager {
  private keys: KeyEntry[] = [];
  private currentIndex = 0;

  constructor() {
    this.load();
  }

  private load() {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        this.keys = parsed.map(k => ({ key: k, rateLimitedUntil: 0, totalRequests: 0 }));
      }
    } catch { /* ignore */ }

    // Auto-add env key if not already in pool
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && !this.keys.some(k => k.key === envKey)) {
      this.keys.unshift({ key: envKey, rateLimitedUntil: 0, totalRequests: 0 });
      this.persist();
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys.map(k => k.key)));
    } catch { /* ignore */ }
  }

  addKey(key: string): boolean {
    if (!key || this.keys.some(k => k.key === key)) return false;
    this.keys.push({ key, rateLimitedUntil: 0, totalRequests: 0 });
    this.persist();
    return true;
  }

  removeKey(key: string) {
    this.keys = this.keys.filter(k => k.key !== key);
    this.persist();
  }

  getNextKey(): string {
    if (this.keys.length === 0) throw new Error('No API keys configured. Add keys in Config.');
    const now = Date.now();

    // Try round-robin, skipping rate-limited keys
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.rateLimitedUntil <= now) {
        this.currentIndex = (idx + 1) % this.keys.length;
        entry.totalRequests++;
        return entry.key;
      }
    }

    // All keys rate-limited — return the one with earliest expiry
    const earliest = this.keys.reduce((a, b) => a.rateLimitedUntil < b.rateLimitedUntil ? a : b);
    earliest.totalRequests++;
    return earliest.key;
  }

  reportRateLimit(key: string) {
    const entry = this.keys.find(k => k.key === key);
    if (entry) {
      entry.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    }
  }

  getKeyCount(): number {
    return this.keys.length;
  }

  getKeys(): { masked: string; limited: boolean; requests: number }[] {
    const now = Date.now();
    return this.keys.map(k => ({
      masked: k.key.slice(0, 6) + '...' + k.key.slice(-4),
      limited: k.rateLimitedUntil > now,
      requests: k.totalRequests,
    }));
  }

  hasKeys(): boolean {
    return this.keys.length > 0;
  }
}

// Singleton
export const keyManager = new ApiKeyManager();
