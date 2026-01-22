import { useState, useEffect, useRef } from 'react';
import type { LatLngBounds } from 'leaflet';
import { logger } from '@/lib/utils/logger';
import { NodeDatum } from '@/lib/api/nodes';
import { dedupeNodesById } from '@/lib/utils/map/deduplication';

import { HubDetails } from '@/providers/NodeDisplayProvider';

interface ViewportResponse {
    nodes: NodeDatum[];
    hub_details: Record<string, HubDetails>;
    next_page: number | null;
    page_size: number;
}

interface FetchResult {
    nodes: NodeDatum[];
    hubDetails: Record<string, HubDetails>;
}

/**
 * useNodeFetcher
 * 
 * Handles fetching nodes from the API based on viewport bounds.
 * - Manages AbortController for cancellation
 * - Handles pagination (fetching all pages if needed)
 * - Integrates basic error handling and loading states
 */
export function useNodeFetcher(bounds: LatLngBounds | null, zoom: number) {
    const [data, setData] = useState<FetchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track the active request to avoid race conditions
    const activeRequestRef = useRef<string | null>(null);

    useEffect(() => {
        if (!bounds) return;

        // Skip fetch if zoom is too low (world view)
        // Adjust threshold based on app requirements
        if (zoom < 10) {
            setData({ nodes: [], hubDetails: {} });
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            const padded = bounds.pad(0.25); // Fetch slightly outside viewport
            const sw = padded.getSouthWest();
            const ne = padded.getNorthEast();

            // Create a unique key for this request
            const reqKey = `${zoom}-${sw.lat}-${sw.lng}-${ne.lat}-${ne.lng}`;
            activeRequestRef.current = reqKey;

            setLoading(true);
            setError(null);

            try {
                // Determine page size based on zoom level
                // Lower zoom = fewer nodes/hubs usually, or clustered
                const basePageSize = zoom < 11 ? 150 : zoom < 14 ? 300 : 500;
                let page = 0;
                let morePages = true;
                let allNodes: NodeDatum[] = [];
                let allHubDetails: Record<string, HubDetails> = {};

                // Fetch loop for pagination
                // Limit max pages to prevent infinite loops or massive downloads
                while (morePages && page < 5) {
                    if (signal.aborted) throw new Error('AbortError');

                    const params = new URLSearchParams({
                        swLat: sw.lat.toString(),
                        swLon: sw.lng.toString(),
                        neLat: ne.lat.toString(),
                        neLon: ne.lng.toString(),
                        zoom: zoom.toString(),
                        page: page.toString(),
                        pageSize: basePageSize.toString(),
                        hubsOnly: 'false', // Always fetch all for now
                        clientVersion: 'v6' // align with MapContainer constant
                    });

                    const res = await fetch(`/api/nodes/viewport?${params.toString()}`, {
                        signal,
                        headers: { 'Accept': 'application/json' }
                    });

                    if (!res.ok) throw new Error(`API Error: ${res.status}`);

                    const json: ViewportResponse = await res.json();

                    if (json.nodes) {
                        allNodes = [...allNodes, ...json.nodes];
                    }

                    if (json.hub_details) {
                        allHubDetails = { ...allHubDetails, ...json.hub_details };
                    }

                    if (json.next_page !== null) {
                        page = json.next_page;
                    } else {
                        morePages = false;
                    }

                    // Safety break if we got fewer results than page size
                    if (json.nodes.length < basePageSize) {
                        morePages = false;
                    }
                }

                if (activeRequestRef.current === reqKey && !signal.aborted) {
                    // [Optimization] Dedupe before setting state
                    const uniqueNodes = dedupeNodesById(allNodes);
                    setData({ nodes: uniqueNodes, hubDetails: allHubDetails });
                }

            } catch (err: any) {
                if (err.name === 'AbortError' || signal.aborted) {
                    // Ignore aborts
                    logger.log('[useNodeFetcher] Request aborted');
                } else {
                    logger.error('[useNodeFetcher] Error:', err);
                    if (activeRequestRef.current === reqKey) {
                        setError(err.message || 'Failed to fetch nodes');
                    }
                }
            } finally {
                if (activeRequestRef.current === reqKey) {
                    setLoading(false);
                }
            }
        };

        // Debounce slightly to avoid rapid requests during pan/zoom
        const timer = setTimeout(fetchData, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
            // activeRequestRef.current = null; // Don't clear ref immediately to allow graceful race handling
        };
    }, [bounds, zoom]);

    return { data, loading, error };
}
