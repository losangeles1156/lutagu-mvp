import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useMapStore } from '@/stores/mapStore';

interface Coordinates {
    lat: number;
    lon: number;
}

/**
 * useMapCentering
 * 
 * Handles moving the map to a specific target or fallback location.
 * logic taken from original MapController.
 * 
 * @param userLocation - Current user location (if available)
 * @param isTooFar - If user is too far from serviced area
 * @param fallback - Fallback location if user is too far or location unknown
 */
export function useMapCentering(
    userLocation: Coordinates | null,
    isTooFar: boolean,
    fallback: Coordinates
) {
    const map = useMap();
    const mapCenter = useMapStore(state => state.mapCenter);
    const lastTargetRef = useRef<Coordinates | null>(null);

    // Determine target priority: 
    // 1. Explicit mapCenter from Store (e.g., search result)
    // 2. User Location (if valid)
    // 3. Fallback (system default)

    // Note: original logic had: target = mapCenter || (isTooFar ? null : center)
    // This implies if isTooFar is true, we ignore userLocation.

    const target = mapCenter || (isTooFar ? null : userLocation);

    useEffect(() => {
        // Case A: System Fallback (No target, User too far, No Store Center)
        if (!target && isTooFar && !mapCenter) {
            if (JSON.stringify(lastTargetRef.current) !== JSON.stringify(fallback)) {
                map.flyTo([fallback.lat, fallback.lon], 15, { animate: true, duration: 1.5 });
                lastTargetRef.current = fallback;
            }
            return;
        }

        // Case B: Valid Target Exists
        if (target) {
            const targetChanged = JSON.stringify(lastTargetRef.current) !== JSON.stringify(target);
            if (targetChanged) {
                map.flyTo([target.lat, target.lon], 15, {
                    animate: true,
                    duration: 1.5
                });
                lastTargetRef.current = target;
            }
        }
    }, [target, map, isTooFar, fallback, mapCenter]);
}
