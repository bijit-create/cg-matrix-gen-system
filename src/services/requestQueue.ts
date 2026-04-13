// Request Queue — concurrency-limited with retry and exponential backoff

import { keyManager } from './apiKeyManager';

interface QueueEntry<T> {
  fn: (apiKey: string) => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  maxRetries: number;
  baseDelay: number;
  priority: number; // lower = higher priority
}

class RequestQueue {
  private queue: QueueEntry<any>[] = [];
  private activeCount = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  setMaxConcurrent(n: number) {
    this.maxConcurrent = Math.max(1, Math.min(10, n));
    this.processNext();
  }

  getStats() {
    return { active: this.activeCount, pending: this.queue.length };
  }

  enqueue<T>(
    fn: (apiKey: string) => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number; priority?: 'high' | 'normal' | 'low' } = {}
  ): Promise<T> {
    const priorityMap = { high: 0, normal: 1, low: 2 };
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject,
        retries: 0,
        maxRetries: options.maxRetries ?? 3,
        baseDelay: options.baseDelay ?? 2000,
        priority: priorityMap[options.priority || 'normal'],
      });
      // Sort by priority
      this.queue.sort((a, b) => a.priority - b.priority);
      this.processNext();
    });
  }

  private processNext() {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      this.activeCount++;
      this.executeEntry(entry);
    }
  }

  private async executeEntry<T>(entry: QueueEntry<T>) {
    const apiKey = keyManager.getNextKey();
    try {
      const result = await entry.fn(apiKey);
      entry.resolve(result);
    } catch (error: any) {
      const is429 = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED');
      const is5xx = error?.status >= 500;

      if (entry.retries < entry.maxRetries && (is429 || is5xx)) {
        entry.retries++;
        const delay = entry.baseDelay * Math.pow(2, entry.retries - 1);

        if (is429) {
          keyManager.reportRateLimit(apiKey);
        }

        // Re-queue with delay
        setTimeout(() => {
          this.queue.unshift(entry); // high priority for retries
          this.activeCount--;
          this.processNext();
        }, Math.min(delay, 30000));
        return;
      }

      entry.reject(error);
    } finally {
      // Only decrement if not re-queued (re-queue handles its own decrement)
      if (entry.retries === 0 || entry.retries > entry.maxRetries) {
        this.activeCount--;
        this.processNext();
      }
    }
  }
}

// Singleton
export const requestQueue = new RequestQueue(2);
