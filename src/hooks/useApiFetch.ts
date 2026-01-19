'use client';

import { useRef, useCallback } from 'react';

interface CachedValue<T> {
    expiresAt: number;
    value: T;
}

interface UseApiFetchOptions {
    ttlMs?: number; // Time to live in milliseconds
    signal?: AbortSignal;
}

interface HttpError extends Error {
    status: number;
    body: string;
}

function createHttpError(status: number, body: string): HttpError {
    const error = new Error(body || `HTTP ${status}`) as HttpError;
    error.status = status;
    error.body = body;
    return error;
}

/**
 * Unified API fetch hook with caching and deduplication
 *
 * Features:
 * - TTL-based caching
 * - In-flight request deduplication
 * - Abort signal support
 * - Error handling with HttpError
 */
export function useApiFetch() {
    const cacheRef = useRef(new Map<string, CachedValue<unknown>>());
    const inFlightRef = useRef(new Map<string, Promise<unknown>>());

    const fetchJson = useCallback(
        async function fetchJson<T = unknown>(
            url: string,
            options: UseApiFetchOptions = {}
        ): Promise<T> {
            const ttlMs = options.ttlMs ?? 5 * 60 * 1000; // Default 5 minutes
            const now = Date.now();

            // Check cache
            const cached = cacheRef.current.get(url);
            if (cached && cached.expiresAt > now) {
                return cached.value as T;
            }

            // Check in-flight request
            const inFlight = inFlightRef.current.get(url);
            if (inFlight) {
                return (await inFlight) as T;
            }

            // Create new request
            const promise = (async () => {
                const res = await fetch(url, {
                    cache: 'no-store',
                    signal: options.signal
                });

                if (!res.ok) {
                    const body = await res.text().catch(() => '');
                    throw createHttpError(res.status, body);
                }

                const json = (await res.json()) as T;
                cacheRef.current.set(url, {
                    expiresAt: now + ttlMs,
                    value: json
                });
                return json;
            })();

            inFlightRef.current.set(url, promise as Promise<unknown>);

            try {
                return await promise;
            } finally {
                inFlightRef.current.delete(url);
            }
        },
        []
    );

    const clearCache = useCallback((url?: string) => {
        if (url) {
            cacheRef.current.delete(url);
        } else {
            cacheRef.current.clear();
        }
    }, []);

    const prefetch = useCallback(
        async function prefetch<T = unknown>(
            url: string,
            options: UseApiFetchOptions = {}
        ): Promise<T | null> {
            try {
                return await fetchJson<T>(url, options);
            } catch {
                return null;
            }
        },
        [fetchJson]
    );

    return {
        fetchJson,
        clearCache,
        prefetch,
        cacheSize: cacheRef.current.size
    };
}

/**
 * Simple fetcher function (without hook) for one-off requests
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: UseApiFetchOptions = {}
): Promise<T> {
    const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    const now = Date.now();

    const res = await fetch(url, {
        cache: 'no-store',
        signal: options.signal
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw createHttpError(res.status, body);
    }

    return (await res.json()) as T;
}
