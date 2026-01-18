'use client';

import { logger } from '@/lib/utils/logger';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { useNodeDisplay, NodeDatum, HubDetails } from '@/providers/NodeDisplayProvider';

// Constants
const CACHE_VERSION = 'v6';

// Types
interface ViewportResponse {
    nodes: NodeDatum[];
    page: number;
    next_page: number | null;
    page_size: number;
    total_in_viewport: number;
    has_more: boolean;
    degraded: boolean;
    source: 'supabase' | 'fallback';
    hub_details: Record<string, HubDetails>;
}

// Utility functions
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function buildViewportKey(params: {
    swLat: number;
    swLon: number;
    neLat: number;
    neLon: number;
    zoom: number;
    hubsOnly: boolean;
}): string {
    const z = Math.round(params.zoom);
    const swLat = Math.round(params.swLat * 1000) / 1000;
    const swLon = Math.round(params.swLon * 1000) / 1000;
    const neLat = Math.round(params.neLat * 1000) / 1000;
    const neLon = Math.round(params.neLon * 1000) / 1000;
    return `${CACHE_VERSION}:${z}:${params.hubsOnly ? 1 : 0}:${swLat},${swLon},${neLat},${neLon}`;
}

interface CacheEntry {
    ts: number;
    nodes: NodeDatum[];
    hubDetails: Record<string, HubDetails>;
    minVersion: number;
    maxVersion: number;
}

/**
 * useNodeFetcher - Isolated hook for fetching nodes based on map viewport
 * Updates the NodeDisplayContext with fetched data
 */
export function useNodeFetcher() {
    const map = useMap();
    const { setNodes, setLoading, setError, state } = useNodeDisplay();
    const { refreshKey } = state;

    const abortRef = useRef<AbortController | null>(null);
    const cacheRef = useRef(new Map<string, CacheEntry>());
    const inFlightKeyRef = useRef<string | null>(null);
    const debounceTimerRef = useRef<number | null>(null);

    const getCacheTTL = useCallback((zoom: number): number => {
        if (zoom >= 16) return 30_000;
        if (zoom >= 14) return 60_000;
        return 120_000;
    }, []);

    const isCacheValid = useCallback((cached: CacheEntry | undefined, currentMinVersion: number, zoom: number): boolean => {
        if (!cached) return false;
        const now = Date.now();
        const ttl = getCacheTTL(zoom);
        if (now - cached.ts > ttl) return false;
        if (currentMinVersion > cached.minVersion) return false;
        return true;
    }, [getCacheTTL]);

    const load = useCallback(async () => {
        const zoom = clamp(map.getZoom(), 1, 22);
        const padded = map.getBounds().pad(0.25);
        const sw = padded.getSouthWest();
        const ne = padded.getNorthEast();

        const hubsOnly = false; // Always fetch all nodes
        const key = buildViewportKey({ swLat: sw.lat, swLon: sw.lng, neLat: ne.lat, neLon: ne.lng, zoom, hubsOnly });
        const now = Date.now();

        // Check cache
        const cached = cacheRef.current.get(key);
        if (cached && isCacheValid(cached, 0, zoom)) {
            setError(null);
            setNodes(cached.nodes, cached.hubDetails);
            return;
        }

        // Prevent duplicate in-flight requests
        if (inFlightKeyRef.current === key) return;
        inFlightKeyRef.current = key;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const basePageSize = zoom < 11 ? 150 : zoom < 14 ? 300 : 500;

            let page = 0;
            let nextPage: number | null = 0;
            const combined: NodeDatum[] = [];
            const allHubDetails: Record<string, HubDetails> = {};
            let minVersion = Infinity;
            let maxVersion = 0;

            while (nextPage !== null && page < 5) {
                const params = new URLSearchParams({
                    swLat: sw.lat.toString(),
                    swLon: sw.lng.toString(),
                    neLat: ne.lat.toString(),
                    neLon: ne.lng.toString(),
                    zoom: zoom.toString(),
                    page: page.toString(),
                    pageSize: basePageSize.toString(),
                    hubsOnly: hubsOnly.toString(),
                    clientVersion: CACHE_VERSION
                });

                const response = await fetch(`/api/nodes/viewport?${params.toString()}`, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const res = (await response.json()) as ViewportResponse;

                for (const n of res.nodes) {
                    if (!combined.some(ex => ex.id === n.id)) {
                        combined.push(n);
                    }
                }

                if (res.hub_details) {
                    Object.assign(allHubDetails, res.hub_details);
                }

                nextPage = res.next_page;
                page = nextPage ?? page + 1;

                if (res.nodes.length < res.page_size) break;
            }

            // Update cache
            cacheRef.current.set(key, {
                ts: now,
                nodes: combined,
                hubDetails: allHubDetails,
                minVersion,
                maxVersion
            });

            // Prevent cache from growing too large
            if (cacheRef.current.size > 50) {
                const firstKey = cacheRef.current.keys().next().value;
                if (firstKey) cacheRef.current.delete(firstKey);
            }

            setNodes(combined, allHubDetails);
        } catch (e: any) {
            if (controller.signal.aborted || e?.name === 'AbortError') return;
            logger.error('[useNodeFetcher] Error:', e?.message);
            setError(String(e?.message || 'Failed to load nodes'));
        } finally {
            setLoading(false);
            inFlightKeyRef.current = null;
        }
    }, [map, setNodes, setLoading, setError, isCacheValid]);

    // Effect: Listen to map events and trigger loading
    useEffect(() => {
        const onMove = () => {
            if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = window.setTimeout(() => {
                load();
            }, 350) as any;
        };

        map.on('moveend', onMove);
        map.on('zoomend', onMove);

        // Initial load
        onMove();

        return () => {
            map.off('moveend', onMove);
            map.off('zoomend', onMove);
            if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
        };
    }, [map, load, refreshKey]);

    return null;
}

/**
 * NodeFetcher component - A wrapper to use the hook inside MapContainer
 */
export function NodeFetcher() {
    useNodeFetcher();
    return null;
}
