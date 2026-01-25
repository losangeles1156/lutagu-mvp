import { useMemo } from 'react';
import type { LatLngBounds } from 'leaflet';
import type { NodeDatum } from '@/lib/api/nodes';

export function useVisibleMarkers(
    nodes: NodeDatum[],
    mapState: { bounds: LatLngBounds | null; zoom: number }
) {
    const { bounds: mapBounds, zoom } = mapState;

    return useMemo(() => {
        if (!mapBounds) return nodes;

        return nodes.filter(node => {
            if (!node.location?.coordinates) return false;

            // 1. Tier-based Visibility Check (The 5-Tier Rule)
            // If min_zoom_level is explicit, use it. Otherwise derive from display_tier.
            const minZoom = node.min_zoom_level || (
                node.display_tier === 1 ? 0 :
                    node.display_tier === 2 ? 12 :
                        node.display_tier === 3 ? 14 :
                            node.display_tier === 4 ? 15 : 16
            );

            if (zoom < minZoom) return false;

            // 2. Viewport Bounding Box Check
            // GeoJSON coordinates are [lon, lat]
            const [lon, lat] = node.location.coordinates;
            // Leaflet mapBounds.contains expects [lat, lon]
            return mapBounds.contains([lat, lon]);
        });
    }, [nodes, mapBounds, zoom]);
}
