'use client';

import { useMemo, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';

// Interface for hub details from API
interface HubMemberInfo {
    member_id: string;
    member_name: any;
    operator: string;
    line_name: string | null;
    transfer_type: string;
    walking_seconds: number | null;
    sort_order: number;
}

interface HubDetails {
    member_count: number;
    transfer_type: string;
    transfer_complexity: string;
    walking_distance_meters: number | null;
    indoor_connection_notes: string | null;
    members?: HubMemberInfo[];
}

interface HubNodeLayerProps {
    nodes: NodeDatum[];
    hubDetails: Record<string, HubDetails>;
    zone: 'core' | 'buffer' | 'outer';
    locale: string;
    showAllNodes?: boolean;  // Show all nodes when in Ward Mode
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function HubNodeLayer({ 
    nodes, 
    hubDetails, 
    zone, 
    locale, 
    showAllNodes = false 
}: HubNodeLayerProps) {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    useMapEvents({
        zoomend: () => setZoom(map.getZoom())
    });

    const clampedZoom = clamp(zoom, 1, 22);

    // Filter nodes based on:
    // 1. showAllNodes mode - show all or just hubs
    // 2. is_active status - filter out inactive nodes
    // 3. parent_hub_id - only show hubs (parent_hub_id IS NULL)
    const visibleNodes = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];
        
        return nodes.filter(n => {
            // Skip if is_active = false (from node_hierarchy)
            // Note: is_active might be in different locations based on the API response
            const isActive = (n as any).is_active ?? 
                            (n as any).hierarchy?.is_active ?? 
                            (n as any).node_hierarchy?.is_active ?? 
                            true;
            if (isActive === false) return false;

            if (showAllNodes) return true;
            
            // Only show hubs (parent_hub_id IS NULL)
            return n.parent_hub_id === null;
        });
    }, [nodes, showAllNodes]);

    return (
        <>
            {visibleNodes.map((node) => {
                const details = hubDetails[node.id];
                if (!details) {
                    console.log('[DEBUG] No hubDetails for node:', node.id);
                }
                return (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        hubDetails={details}
                        zone={zone}
                        locale={locale}
                        zoom={clampedZoom}
                    />
                );
            })}
        </>
    );
}
