'use client';

import { useMemo, useState, useCallback } from 'react';
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
    currentNodeId?: string | null;  // Currently selected node for highlighting
    expandedHubId?: string | null;
    expandedNodeIds?: string[] | null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

// [PERF] Max nodes to render based on zoom level
function getMaxNodesForZoom(zoom: number): number {
    if (zoom >= 16) return 200;  // High zoom: show more detail
    if (zoom >= 14) return 100;  // Medium zoom
    if (zoom >= 12) return 50;   // Low zoom: only major hubs
    return 30;                    // Very low zoom: minimal
}

export function HubNodeLayer({
    nodes,
    hubDetails,
    zone,
    locale,
    showAllNodes = false,
    currentNodeId = null,
    expandedHubId = null,
    expandedNodeIds = null
}: HubNodeLayerProps) {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());
    // [PERF] Track viewport bounds for culling
    const [boundsVersion, setBoundsVersion] = useState(0);

    // [PERF] Update bounds version on map movement to trigger re-filtering
    useMapEvents({
        zoomend: () => {
            setZoom(map.getZoom());
            setBoundsVersion(v => v + 1);
        },
        moveend: () => {
            setBoundsVersion(v => v + 1);
        }
    });

    const clampedZoom = clamp(zoom, 1, 22);
    const maxNodes = getMaxNodesForZoom(clampedZoom);

    // [PERF] Get current viewport bounds for culling
    const viewportBounds = useMemo(() => {
        // Trigger recalculation when boundsVersion changes
        void boundsVersion;
        const bounds = map.getBounds();
        // Pad bounds slightly to prevent pop-in at edges
        const padded = bounds.pad(0.1);
        return {
            swLat: padded.getSouthWest().lat,
            swLng: padded.getSouthWest().lng,
            neLat: padded.getNorthEast().lat,
            neLng: padded.getNorthEast().lng
        };
    }, [map, boundsVersion]);

    // Filter nodes based on:
    // 1. Viewport culling - only render nodes in view
    // 2. is_active status - filter out inactive nodes
    // 3. parent_hub_id - only show hubs (parent_hub_id IS NULL)
    // 4. Zoom density control - limit nodes at low zoom
    const visibleNodes = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        const expandedSet = expandedNodeIds ? new Set(expandedNodeIds) : null;

        const eligibleNodes = nodes.filter(n => {
            // Skip if is_active = false (from node_hierarchy)
            const isActive = (n as any).is_active ??
                (n as any).hierarchy?.is_active ??
                (n as any).node_hierarchy?.is_active ??
                true;
            if (isActive === false) return false;

            if (showAllNodes) return true;

            if (n.parent_hub_id === null) return true;
            if (expandedHubId && n.parent_hub_id === expandedHubId) return true;
            if (expandedSet && expandedSet.has(n.id)) return true;
            return false;
        });

        const inViewNodes = eligibleNodes.filter(n => {
            const [lon, lat] = n.location.coordinates;
            return lat >= viewportBounds.swLat &&
                lat <= viewportBounds.neLat &&
                lon >= viewportBounds.swLng &&
                lon <= viewportBounds.neLng;
        });

        if (!expandedHubId) {
            const prioritized = [...inViewNodes].sort((a, b) => {
                const aCount = hubDetails[a.id]?.member_count || 0;
                const bCount = hubDetails[b.id]?.member_count || 0;
                return bCount - aCount;
            });
            return prioritized.slice(0, maxNodes);
        }

        const expandedGroup = inViewNodes
            .filter(n => n.id === expandedHubId || n.parent_hub_id === expandedHubId || (expandedSet && expandedSet.has(n.id)))
            .sort((a, b) => {
                if (a.id === expandedHubId && b.id !== expandedHubId) return -1;
                if (b.id === expandedHubId && a.id !== expandedHubId) return 1;
                const aName = String((a as any).name?.[locale] || (a as any).name?.['zh-TW'] || (a as any).name?.en || a.id);
                const bName = String((b as any).name?.[locale] || (b as any).name?.['zh-TW'] || (b as any).name?.en || b.id);
                return aName.localeCompare(bName);
            });

        const otherHubs = inViewNodes
            .filter(n => n.parent_hub_id === null && n.id !== expandedHubId)
            .sort((a, b) => {
                const aCount = hubDetails[a.id]?.member_count || 0;
                const bCount = hubDetails[b.id]?.member_count || 0;
                return bCount - aCount;
            });

        if (expandedGroup.length >= maxNodes) return expandedGroup.slice(0, maxNodes);
        return [...expandedGroup, ...otherHubs.slice(0, Math.max(0, maxNodes - expandedGroup.length))];
    }, [nodes, showAllNodes, viewportBounds, hubDetails, maxNodes, expandedHubId, expandedNodeIds, locale]);

    return (
        <>
            {visibleNodes.map((node) => {
                const details = hubDetails[node.id];
                return (
                    <NodeMarker
                        key={node.id}
                        node={node}
                        hubDetails={details}
                        zone={zone}
                        locale={locale}
                        zoom={clampedZoom}
                        isSelected={node.id === currentNodeId || (expandedHubId !== null && node.id === expandedHubId)}
                    />
                );
            })}
        </>
    );
}
