import { useEffect } from 'react';
import { useMap } from 'react-leaflet'; // Allows access to Leaflet's map instance
import { useViewportBounds } from '@/hooks/map/useViewportBounds';
import { useNodeFetcher } from '@/hooks/map/useNodeFetcher';
import { useNodeVersionControl } from '@/hooks/map/useNodeVersionControl';
import { useNodeDisplay } from '@/providers/NodeDisplayProvider';

/**
 * ViewportNodeLoader_Optimized
 * 
 * Orchestrates data fecthing for the map:
 * 1. Tracks Viewport Bounds (useViewportBounds)
 * 2. Fetches Data from API (useNodeFetcher)
 * 3. Handles Versioning & Deduplication (useNodeVersionControl)
 * 4. Pushes updates to Global Context (useNodeDisplay)
 * 
 * This component is "logic-only" and renders nothing.
 */
export function ViewportNodeLoader_Optimized() {
    const map = useMap(); // Get map context
    const { bounds } = useViewportBounds();
    const zoom = map.getZoom();

    // 1. Fetch data based on bounds/zoom
    const { data: rawData, loading, error } = useNodeFetcher(bounds, zoom);

    // 2. Process data (Dedupe & Version Check)
    const { nodes: processedNodes } = useNodeVersionControl(rawData?.nodes || []);

    // 3. Update Global Context
    const { setNodes, setLoading, setError } = useNodeDisplay();

    // Sync Loading State
    useEffect(() => {
        setLoading(loading);
    }, [loading, setLoading]);

    // Sync Error State
    useEffect(() => {
        if (error) setError(error);
    }, [error, setError]);

    // Sync Data
    // We only update if we have actual processed nodes or if we need to clear (empty array)
    // rawData checks ensure we don't wipe data prematurely
    useEffect(() => {
        if (rawData) {
            setNodes(processedNodes, rawData.hubDetails || {});
        }
    }, [processedNodes, rawData, setNodes]);

    return null;
}
