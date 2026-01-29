import { useMemo } from 'react';
import type { LatLngBounds } from 'leaflet';
import type { NodeDatum } from '@/lib/api/nodes';
import { ZOOM_THRESHOLD } from '@/lib/constants/MapDisplayPolicy';

export function useVisibleMarkers(
    nodes: NodeDatum[],
    mapState: { bounds: LatLngBounds | null; zoom: number }
) {
    const { bounds: mapBounds, zoom } = mapState;

    return useMemo(() => {
        if (!mapBounds) return nodes;

        const filteredNodes = nodes.filter(node => {
            if (!node.location?.coordinates) return false;

            // 1. Tier-based Visibility Check (The 5-Tier Rule)
            // Use explicit display_tier or default to 5 (Local)
            const tier = node.display_tier || 5;
            const minZoom = node.min_zoom_level ?? (ZOOM_THRESHOLD[tier as keyof typeof ZOOM_THRESHOLD] || 16);

            if (zoom < minZoom) return false;

            // 2. Viewport Bounding Box Check
            const [lon, lat] = node.location.coordinates;
            return mapBounds.contains([lat, lon]);
        });

        // 3. Hub Aggregation Rule: Hide members if their parent_hub is present.
        // This ensures T1/T2 Hubs only show a single marker.
        const hubIds = new Set(filteredNodes.filter(n => n.is_hub).map(n => n.id));
        return filteredNodes.filter(node => {
            if (node.parent_hub_id && hubIds.has(node.parent_hub_id)) {
                return false;
            }
            return true;
        });
    }, [nodes, mapBounds, zoom]);
}
