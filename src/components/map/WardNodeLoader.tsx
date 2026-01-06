
import React, { useEffect, useRef } from 'react';
import { fetchNodesByWard } from '@/lib/api/nodesByWard';
import { NodeDatum } from '@/lib/api/nodes';
import { isNodeAllowed } from '@/lib/constants/allowedOperators';
import { getNodeCoordinates, isWithinTokyo23Wards } from '@/lib/utils/geoUtils';

interface WardNodeLoaderProps {
    wardIds: string[];
    onNodesLoaded: (nodes: NodeDatum[]) => void;
    onLoadingChange: (isLoading: boolean) => void;
}

export function WardNodeLoader({ wardIds, onNodesLoaded, onLoadingChange }: WardNodeLoaderProps) {
    const loadedWardsRef = useRef<string>('');

    useEffect(() => {
        let isMounted = true;

        async function load() {
            if (wardIds.length === 0) {
                onNodesLoaded([]);
                return;
            }

            const wardsKey = wardIds.sort().join(',');
            if (loadedWardsRef.current === wardsKey) return; // Prevent duplicate loads

            onLoadingChange(true);
            try {
                // Fetch nodes from all selected wards in parallel
                const results = await Promise.all(
                    wardIds.map(wardId => fetchNodesByWard(wardId))
                );

                // Flatten and deduplicate by node ID
                const allNodes = results.flat();
                const uniqueNodesMap = new Map<string, NodeDatum>();
                allNodes.forEach(node => {
                    if (node?.id && !uniqueNodesMap.has(node.id)) {
                        uniqueNodesMap.set(node.id, node);
                    }
                });

                // Apply railway operator filter
                const operatorFiltered = Array.from(uniqueNodesMap.values()).filter(node =>
                    isNodeAllowed(node.id)
                );

                // Apply Tokyo 23 wards geographic bounds filter
                const filteredNodes = operatorFiltered.filter(node => {
                    const coords = getNodeCoordinates(node);
                    if (!coords) return false;
                    return isWithinTokyo23Wards(coords[0], coords[1]);
                });

                if (isMounted) {
                    console.log(`[WardNodeLoader] Loaded ${allNodes.length} total, ${operatorFiltered.length} after operator filter, ${filteredNodes.length} after bounds filter, from ${wardIds.length} wards`);
                    onNodesLoaded(filteredNodes);
                    loadedWardsRef.current = wardsKey;
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
    }, [wardIds, onNodesLoaded, onLoadingChange]);

    return null; // Logic only component
}
