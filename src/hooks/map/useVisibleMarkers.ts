import { useMemo } from 'react';
import type { LatLngBounds } from 'leaflet';
import type { NodeDatum } from '@/lib/api/nodes';

export function useVisibleMarkers(
    nodes: NodeDatum[],
    mapBounds: LatLngBounds | null
) {
    return useMemo(() => {
        if (!mapBounds) return nodes;

        // Perform simple bounding box check
        // LatLngBounds.contains works with {lat, lon} or [lat, lon] usually
        // Leaflet bounds usually have methods.

        // Optimizing: Create local variables for bounds to avoid method calls in loop if needed,
        // but Leaflet's contains is reasonably fast.

        return nodes.filter(node => {
            if (!node.location?.coordinates) return false;

            // GeoJSON is [lon, lat]
            const [lon, lat] = node.location.coordinates;

            // mapBounds.contains expects LatLng or [lat, lon]
            return mapBounds.contains([lat, lon]);
        });
    }, [nodes, mapBounds]);
}
