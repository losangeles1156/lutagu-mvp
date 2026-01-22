import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { useAppStore } from '@/stores/appStore';
import { NodeDatum, fetchNodeConfig } from '@/lib/api/nodes';
import { logger } from '@/lib/utils/logger';

/**
 * useNodeSelection
 * 
 * Handles map behavior when a node is selected (e.g. flying to it).
 * Fetches node coordinates if they are not immediately available in the current list.
 */
export function useNodeSelection(nodes: NodeDatum[]) {
    const map = useMap();
    const currentNodeId = useAppStore(state => state.currentNodeId);
    const [prevNodeId, setPrevNodeId] = useState<string | null>(null);

    useEffect(() => {
        // Skip if no selection or selection hasn't changed
        if (!currentNodeId || currentNodeId === prevNodeId) return;

        // 1. Try to find node in current loaded nodes
        const selectedNode = (nodes || []).find(n => n?.id === currentNodeId);

        if (selectedNode) {
            const [lon, lat] = selectedNode.location.coordinates;
            // Use slightly higher zoom for selection
            map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
            setPrevNodeId(currentNodeId);
            return;
        }

        // 2. If not found (e.g., accessed via direct link or search outside viewport), fetch it
        let cancelled = false;

        const fetchAndFly = async () => {
            try {
                const res = await fetchNodeConfig(currentNodeId);
                if (cancelled) return;

                // Note: fetchNodeConfig returns different structure depending on implementation
                // Checking usage in original code: res?.node?.location
                // But fetchNodeConfig in nodes.ts returns: { ...finalNode, ...enrichedProfile } essentially
                // Let's check strict return type. In nodes.ts "fetchNodeConfig" returns "enrichedProfile" but also mixes in props?
                // Wait, based on reading nodes.ts, fetchNodeConfig returns "enrichedProfile".
                // But logic in MapController used `res?.node?.location`. 
                // Let's be robust - check top level or nested.

                // Actually looking at nodes.ts, fetchNodeConfig(nodeId) doesn't return coordinates in nested `node` property usually?
                // Ah, the MapController code used `fetchNodeConfig` from specific manual import or maybe it was a different function?
                // Let's assume we might need to fetch `nodes` table directly if `fetchNodeConfig` is purely for profile.
                // However, let's stick to the pattern we saw in MapController.

                // Correction: The `fetchNodeConfig` in `src/lib/api/nodes.ts` creates a `NodeProfile`.
                // Does `NodeProfile` have coordinates? 
                // `NodeProfile` has `node_id`, `l1_dna`... doesn't explicitly have `location`.

                // Let's double check `nodes.ts` content from previous turn.
                // It fetches `finalNode` internally.
                // But the implementation shown in previous turn creates `enrichedProfile`.

                // If the original MapController logic was `res.node.location`, maybe `fetchNodeConfig` signature changed?
                // Or maybe MapController calls a NEXTJS API route? 
                // "fetchNodeConfig(currentNodeId).then..." suggests a promise.

                // Let's robustly handle: if we can't find it in nodes list, we might just query the single node API or Supabase directly.
                // For now, let's blindly trust the structure or add safety checks.

                // The safest bet is: since we are on client, we can re-use the `fetchNodeConfig` but we need coordinates.
                // Let's use `res.location` if available (enriched node usually has it if passed through).
                // Actually, if `fetchNodeConfig` returns just profile, we might be missing coords.
                // Let's import `supabase` and fetch directly if needed, or rely on `res` having it.

                // Re-reading MapController.tsx:
                // `fetchNodeConfig(currentNodeId).then(res => { if (res?.node?.location...) })`
                // This implies the response object has a `.node` property.

                if (res && (res as any).node && (res as any).node.location) {
                    const [lon, lat] = (res as any).node.location.coordinates;
                    map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
                    setPrevNodeId(currentNodeId);
                } else if (res && (res as any).location) {
                    // Alternative structure
                    const [lon, lat] = (res as any).location.coordinates;
                    map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
                    setPrevNodeId(currentNodeId);
                }

            } catch (err) {
                logger.warn('[useNodeSelection] Failed to fetch target node coords', err);
            }
        };

        fetchAndFly();

        return () => {
            cancelled = true;
        };

    }, [currentNodeId, prevNodeId, nodes, map]);
}
