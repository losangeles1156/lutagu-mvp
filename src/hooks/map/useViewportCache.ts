import { useRef, useCallback } from 'react';
import { CacheEntry } from '@/lib/utils/map/cache';

export function useViewportCache(getCacheTTL: (zoom: number) => number) {
    const cacheRef = useRef(new Map<string, CacheEntry>());

    const get = useCallback((key: string, zoom: number) => {
        const cached = cacheRef.current.get(key);
        if (!cached) return null;

        const now = Date.now();
        const ttl = getCacheTTL(zoom);

        if (now - cached.ts > ttl) {
            cacheRef.current.delete(key);
            return null;
        }

        return cached;
    }, [getCacheTTL]);

    const set = useCallback((key: string, data: any[], version: number = 0) => {
        cacheRef.current.set(key, {
            nodes: data,
            ts: Date.now(),
            version
        });
    }, []);

    const clear = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    return { get, set, clear };
}
