interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  /** Returns the cached value or runs `load` once, sharing it between concurrent callers. */
  getOrLoad(key: string, load: () => Promise<T>, ttlMs?: number): Promise<T>;
  readonly size: number;
}

/** In-memory LRU cache with per-entry expiry. Lives as long as the server process. */
export function createTtlCache<T>(options: {
  maxEntries: number;
  ttlMs: number;
  now?: () => number;
}): TtlCache<T> {
  const { maxEntries, ttlMs: defaultTtl, now = Date.now } = options;
  const entries = new Map<string, Entry<T>>();
  const pending = new Map<string, Promise<T>>();

  function get(key: string): T | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used.
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  }

  function set(key: string, value: T, ttlMs = defaultTtl): void {
    if (ttlMs <= 0) return;
    entries.delete(key);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value as string;
      entries.delete(oldest);
    }
  }

  function getOrLoad(key: string, load: () => Promise<T>, ttlMs = defaultTtl): Promise<T> {
    const cached = get(key);
    if (cached !== undefined) return Promise.resolve(cached);

    const inFlight = pending.get(key);
    if (inFlight) return inFlight;

    const promise = load()
      .then((value) => {
        set(key, value, ttlMs);
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  }

  return {
    get,
    set,
    getOrLoad,
    get size() {
      return entries.size;
    }
  };
}
