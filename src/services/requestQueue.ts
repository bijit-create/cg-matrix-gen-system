// Request Queue — concurrency-limited with retry and exponential backoff
// No API key handling — the server proxy manages keys

interface QueueEntry<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  maxRetries: number;
  baseDelay: number;
  priority: number;
}

class RequestQueue {
  private queue: QueueEntry<any>[] = [];
  private activeCount = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
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
    fn: () => Promise<T>,
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
    try {
      const result = await entry.fn();
      entry.resolve(result);
    } catch (error: any) {
      const retryable = error?.retryable || error?.status === 429 || error?.status >= 500;

      if (entry.retries < entry.maxRetries && retryable) {
        entry.retries++;
        const delay = Math.min(entry.baseDelay * Math.pow(2, entry.retries - 1), 30000);

        setTimeout(() => {
          this.queue.unshift(entry);
          this.activeCount--;
          this.processNext();
        }, delay);
        return;
      }

      entry.reject(error);
    } finally {
      if (entry.retries === 0 || entry.retries > entry.maxRetries) {
        this.activeCount--;
        this.processNext();
      }
    }
  }
}

export const requestQueue = new RequestQueue(3);
