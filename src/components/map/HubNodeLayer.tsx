'use client';

import { useMemo, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';
import { getNodeDisplayManifest } from '@/lib/constants/MapDisplayPolicy';
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import '@changey/react-leaflet-markercluster/dist/styles.min.css';
// Note: Some versions might require leaflet.markercluster/dist/MarkerCluster.css directly if included in deps
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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

type NodePriority = 'hub' | 'transfer' | 'cluster' | 'single';

interface HubNodeLayerProps {
    nodes: NodeDatum[];
    hubDetails: Record<string, HubDetails>;
    zone: 'core' | 'buffer' | 'outer';
    locale: string;
    showAllNodes?: boolean;  // Show all nodes when in Ward Mode
    currentNodeId?: string | null;  // Currently selected node for highlighting
    expandedHubId?: string | null;
    expandedNodeIds?: string[] | null;
    enableClustering?: boolean;
    zoom: number; // [NEW] Accept zoom from parent
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

// [PERF] Max nodes count logic removed - now handled by useVisibleMarkers

export function HubNodeLayer({
    nodes,
    hubDetails,
    zone,
    locale,
    showAllNodes = false,
    currentNodeId = null,
    expandedHubId = null,
    expandedNodeIds = null,
    enableClustering = false,
    zoom
}: HubNodeLayerProps) {

    const clampedZoom = clamp(zoom, 1, 22);
    // [PERF] Quantize zoom to integer to reduce re-renders of NodeMarkers
    const quantizedZoom = Math.floor(clampedZoom);

    // Filter nodes based on:
    // 1. parent_hub_id - only show hubs (parent_hub_id IS NULL)
    // 2. Expansion Logic: Show members if the hub is expanded or selected
    // Note: useVisibleMarkers already handles Viewport and Zoom Tier filtering
    const visibleNodes = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        const expandedSet = expandedNodeIds ? new Set(expandedNodeIds) : null;

        return nodes.filter(n => {
            // Already handled by useVisibleMarkers, but safety check for is_active
            const isActive = (n as any).is_active ?? (n as any).hierarchy?.is_active ?? true;
            if (isActive === false) return false;

            // [PRO MAX] Hub Aggregation: Only show true hubs or non-hub nodes
            const isMemberOfHub = !!n.parent_hub_id;

            if (isMemberOfHub) {
                const isRelativelySelected =
                    n.id === currentNodeId ||
                    n.parent_hub_id === expandedHubId ||
                    (expandedSet && expandedSet.has(n.id));

                if (!isRelativelySelected) return false;
            }

            return true;
        });
    }, [nodes, expandedHubId, expandedNodeIds, currentNodeId]);

    const sortedVisibleNodes = useMemo(() => {
        // Sort by Tier (ascending) so Tier 1 is last (on top) or first?
        // In React render order, last element is ON TOP.
        // So we want Tier 5 -> Tier 1.
        return [...visibleNodes].sort((a, b) => {
            const tierA = (a as any).display_tier || 5;
            const tierB = (b as any).display_tier || 5;
            return tierB - tierA; // 5 first, 1 last
        });
    }, [visibleNodes]);


    // Unified Rendering Loop
    const unclusteredMarkers: JSX.Element[] = [];
    const clusteredMarkers: JSX.Element[] = [];

    sortedVisibleNodes.forEach(node => {
        const tier = (node as any).display_tier || 5;
        // Use manifest to decide clustering
        // Since we are iterating, we can call manifest here or just use the known policy rule
        // However, calling manifest inside loop might be slightly expensive if not cautious.
        // But getNodeDisplayManifest is fast.
        const manifest = getNodeDisplayManifest(tier, quantizedZoom, node.id === currentNodeId);
        const shouldCluster = manifest.shouldCluster;

        const details = hubDetails[node.id];
        const marker = (
            <NodeMarker
                key={node.id}
                node={node}
                hubDetails={details}
                zone={zone}
                locale={locale}
                zoom={quantizedZoom}
                isSelected={node.id === currentNodeId || (expandedHubId !== null && node.id === expandedHubId)}
                crowdLevel={node.crowd_level}
                disruptionStatus={node.disruption_status}
            />
        );

        if (shouldCluster) {
            clusteredMarkers.push(marker);
        } else {
            unclusteredMarkers.push(marker);
        }
    });

    if (enableClustering) {
        return (
            <>
                {/* Tier 1-2: Always visible, no cluster */}
                {unclusteredMarkers}

                {/* Tier 3-5: Cluster Enabled */}
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                >
                    {clusteredMarkers}
                </MarkerClusterGroup>
            </>
        );
    }

    return <>{[...unclusteredMarkers, ...clusteredMarkers]}</>;
}
