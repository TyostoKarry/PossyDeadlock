import { LRUCache } from 'lru-cache';

interface ApiCacheOptions {
    ttlMs: number;
    max: number;
}

export interface ApiCache<K, V> {
    get: (key: K, fetchFn: () => Promise<V>) => Promise<V>;
}

// Short-lived cache for on-demand deadlock-api calls. Stores the pending promise so
// concurrent callers share one request, and drops failed requests so errors are not cached.
export const createApiCache = <K extends string | number, V>({
    ttlMs,
    max,
}: ApiCacheOptions): ApiCache<K, V> => {
    const cache = new LRUCache<K, Promise<V>>({ max, ttl: ttlMs });

    return {
        get: (key, fetchFn): Promise<V> => {
            const cached = cache.get(key);
            if (cached) return cached;

            const pending = fetchFn();
            cache.set(key, pending);
            pending.catch(() => {
                if (cache.get(key) === pending) cache.delete(key);
            });
            return pending;
        },
    };
};
