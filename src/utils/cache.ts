/**
 * Lightweight TTL cache for OmniFocus query results.
 *
 * Read tools (database_overview, query_omnifocus) cache their results
 * to avoid redundant JXA round-trips within a short window.
 * Write tools (add, edit, move, remove, batch_*) call invalidate()
 * so the next read sees fresh data.
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds

class ResultCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttl: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, expires: Date.now() + this.ttl });
  }

  /** Drop all entries — call after any write operation. */
  invalidate(): void {
    this.store.clear();
  }
}

/** Deterministic cache key from tool params. */
export function cacheKey(tool: string, params: Record<string, unknown>): string {
  return tool + ':' + JSON.stringify(params);
}

/** Singleton shared across all tools. */
export const cache = new ResultCache();
