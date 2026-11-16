/**
 * In-process idempotency gate for concurrent duplicate submissions.
 * Database unique constraints remain the source of truth across processes.
 */
export class IdempotencyGate {
  private readonly inflight = new Map<string, Promise<unknown>>();

  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await work();
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }
}

export const bookkeepingIdempotency = new IdempotencyGate();
