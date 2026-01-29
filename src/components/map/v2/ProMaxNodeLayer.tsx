'use client';

import { useProMaxNodes } from '@/hooks/map/v2/useProMaxNodes';
import { RadicalNodeMarker } from './RadicalNodeMarker';
import { useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import { useNodeStore } from '@/stores/nodeStore';

/**
 * ProMaxNodeLayer (V2)
 * 
 * The "Clean Core" map layer.
 * - Uses isolated `useProMaxNodes` hook for data.
 * - Renders `RadicalNodeMarker` for visual impact.
 * - No complex clustering logic for Tier 1-2 (Always visible).
 */
export function ProMaxNodeLayer() {
    const currentNodeId = useNodeStore(s => s.currentNodeId);
    // Zoom State from Map Events (Since we need it for LOD inside hook)
    const [zoom, setZoom] = useState(15);

    useMapEvents({
        zoomend: (e) => {
            setZoom(e.target.getZoom());
        }
    });

    // Use Isolated Hook
    const nodes = useProMaxNodes(zoom);

    return (
        <>
            {nodes.map(node => (
                <RadicalNodeMarker
                    key={node.id}
                    node={node}
                    zoom={zoom}
                    isSelected={node.id === currentNodeId}
                />
            ))}
        </>
    );
}
