import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { NodeDatum } from '@/lib/api/nodes';
import { useAppStore } from '@/stores/appStore';
import { useMapCentering } from '@/hooks/map/useMapCentering';
import { useNodeSelection } from '@/hooks/map/useNodeSelection';

interface MapControllerProps {
    center: { lat: number, lon: number } | null;
    isTooFar: boolean;
    fallback: { lat: number, lon: number };
    nodes?: NodeDatum[]; // Made optional to be safe
}

/**
 * MapController_Optimized
 * 
 * Decoupled controller for handling map movements.
 * - System Centering (Fallback/User Location) -> useMapCentering
 * - Node Selection (FlyTo selected node) -> useNodeSelection
 * - Interaction (Drag handling) -> Local Effect
 */
export function MapController_Optimized({
    center,
    isTooFar,
    fallback,
    nodes = []
}: MapControllerProps) {
    const map = useMap();
    const mapCenter = useAppStore(state => state.mapCenter);

    // 1. Handle System Centering priorities
    useMapCentering(center, isTooFar, fallback);

    // 2. Handle Node Selection FlyTo
    useNodeSelection(nodes);

    // 3. Handle User Interaction (Clear overrides on drag)
    useEffect(() => {
        const onMoveStart = () => {
            if (mapCenter) {
                // Future enhancement: Clear active target if user manually pans away?
                // Currently keeping as-is to match original behavior (which was commented out/placeholder)
                // console.log("User interacion started");
            }
        };

        map.on('movestart', onMoveStart);
        return () => { map.off('movestart', onMoveStart); };
    }, [map, mapCenter]);

    return null;
}
