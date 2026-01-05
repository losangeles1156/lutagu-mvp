
import React, { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetchNodesByWard } from '@/lib/api/nodesByWard';
import { NodeDatum } from '@/lib/api/nodes';
// import { L } from 'leaflet'; // Leaflet types not needed for this component logic

interface WardNodeLoaderProps {
    wardId: string | null;
    onNodesLoaded: (nodes: NodeDatum[]) => void;
    onLoadingChange: (isLoading: boolean) => void;
}

export function WardNodeLoader({ wardId, onNodesLoaded, onLoadingChange }: WardNodeLoaderProps) {
    const loadedWardRef = useRef<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            if (!wardId) return;
            if (loadedWardRef.current === wardId) return; // Prevent duplicate logical loads

            onLoadingChange(true);
            try {
                const nodes = await fetchNodesByWard(wardId);
                if (isMounted) {
                    console.log(`[WardNodeLoader] Loaded ${nodes.length} nodes for ward: ${wardId}`);
                    onNodesLoaded(nodes);
                    loadedWardRef.current = wardId;
                }
            } catch (err) {
                console.error('[WardNodeLoader] Error loading ward nodes:', err);
            } finally {
                if (isMounted) onLoadingChange(false);
            }
        }

        load();

        return () => {
            isMounted = false;
        };
    }, [wardId, onNodesLoaded, onLoadingChange]);

    return null; // Logic only component
}
