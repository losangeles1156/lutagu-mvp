'use client';

import { useMemo, useState, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { NodeDatum } from '@/lib/api/nodes';
import { NodeMarker } from './NodeMarker';
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
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

// [PERF] Max nodes to render based on zoom level
function getMaxNodesForZoom(zoom: number): number {
    if (zoom >= 15) return 200;  // High zoom: show more detail
    if (zoom >= 13) return 100;  // Medium zoom
    if (zoom >= 12) return 50;   // Low zoom: only major hubs
    return 30;                    // Very low zoom: minimal
}

function getLabelCapForZoom(zoom: number): number {
    if (zoom >= 17) return 350;
    if (zoom >= 15) return 200;
    if (zoom >= 13) return 80;
    return 30;
}

function getClusterCellSizeMeters(zoom: number): number {
    if (zoom < 13) return 600;
    if (zoom < 15) return 300;
    return 150;
}

function metersToLat(meters: number): number {
    return meters / 111320;
}

function metersToLon(meters: number, lat: number): number {
    return meters / (111320 * Math.cos((lat * Math.PI) / 180));
}

export function HubNodeLayer({
    nodes,
    hubDetails,
    zone,
    locale,
    showAllNodes = false,
    currentNodeId = null,
    expandedHubId = null,
    expandedNodeIds = null,
    enableClustering = false
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
    // [OPTIMIZED] LOD Logic: Filter based on Hub Importance (member_count) vs Zoom
    const visibleNodes = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        const expandedSet = expandedNodeIds ? new Set(expandedNodeIds) : null;

        // Define Thresholds
        // Zoom < 13: Only Mega Hubs (4+ lines)
        // Zoom 13-14: All Hubs
        // Zoom >= 15: All Stations
        const minMemberCount = clampedZoom < 13 ? 4 : (clampedZoom < 15 ? 2 : 0);
        const showAllForZoom = showAllNodes || clampedZoom >= 15;
        const showAllHubsForZoom = clampedZoom >= 13;

        // Filter Step 1: Eligibility & Viewport
        const inViewCandidates = nodes.filter(n => {
            // 1. Must be active
            const isActive = (n as any).is_active ?? (n as any).hierarchy?.is_active ?? true;
            if (isActive === false) return false;

            // 2. Always show nodes related to current selection
            if (n.id === currentNodeId) return true;
            if (n.parent_hub_id === expandedHubId) return true; // Children of expanded
            if (n.id === expandedHubId) return true;            // The expanded hub itself
            if (expandedSet && expandedSet.has(n.id)) return true;

            // 3. Viewport Check
            const [lon, lat] = n.location.coordinates;
            if (lat < viewportBounds.swLat || lat > viewportBounds.neLat ||
                lon < viewportBounds.swLng || lon > viewportBounds.neLng) {
                return false;
            }

            // 4. Default Visibility Logic (Hub vs Child)
            if (showAllForZoom) return true;

            const isExplicitHub = n.is_hub === true || n.parent_hub_id === null;
            if (!isExplicitHub) return false;

            if (showAllHubsForZoom) return true;

            // 5. LOD Connectivity Check
            const count = hubDetails[n.id]?.member_count || 0;
            return count >= minMemberCount;
        });

        // Step 2: Sorting (Priority to Connectivity)
        // If expanded, keep expanded group at top/together logic if needed, 
        // but for now, simple sort is enough as long as we don't slice out the selected one.

        inViewCandidates.sort((a, b) => {
            // Always prioritize selected/expanded
            const aIsSelected = a.id === expandedHubId || a.id === currentNodeId;
            const bIsSelected = b.id === expandedHubId || b.id === currentNodeId;
            if (aIsSelected && !bIsSelected) return -1;
            if (!aIsSelected && bIsSelected) return 1;

            const aCount = hubDetails[a.id]?.member_count || 0;
            const bCount = hubDetails[b.id]?.member_count || 0;
            return bCount - aCount;
        });

        // Step 3: Hard Cap (Safety Valve)
        // Allow more nodes if we are zoomed in
        const safetyLimit = clampedZoom >= 15 ? 300 : (clampedZoom >= 13 ? 100 : 40);

        return inViewCandidates.slice(0, safetyLimit);
    }, [nodes, showAllNodes, viewportBounds, hubDetails, clampedZoom, expandedHubId, expandedNodeIds, currentNodeId]);

    // [OPTIMIZATION] If clustering is enabled, we still use visibleNodes but we might want to relax the 'maxNodes' limit
    // However, existing logic slices 'visibleNodes' at the end of useMemo.
    // If we want clustering to show *more* nodes, we arguably should change the slicing logic above.
    // But modifying the complex useMemo is risky without full refactor.
    // For now, we cluster whatever is passed (which is strictly viewport filtered & density limited).
    // To truly benefit from clustering, we should probably bypass the density limit (slice) when clustering is on.
    // But that requires refactoring useMemo.
    // Let's assume for this step we cluster what we have, improving overlap visuals.

    const labelSet = useMemo(() => {
        if (!visibleNodes || visibleNodes.length === 0) return new Set<string>();

        const selectedIds = new Set<string>();
        if (currentNodeId) selectedIds.add(currentNodeId);
        if (expandedHubId) selectedIds.add(expandedHubId);
        if (expandedNodeIds) expandedNodeIds.forEach(id => selectedIds.add(id));

        const cellSizeMeters = getClusterCellSizeMeters(clampedZoom);
        const cellMap = new Map<string, NodeDatum[]>();
        const cellSizeLat = metersToLat(cellSizeMeters);

        visibleNodes.forEach(node => {
            const [lon, lat] = node.location.coordinates;
            const cellSizeLon = metersToLon(cellSizeMeters, lat);
            const latKey = Math.floor(lat / cellSizeLat);
            const lonKey = Math.floor(lon / cellSizeLon);
            const key = `${latKey}:${lonKey}`;
            const list = cellMap.get(key) || [];
            list.push(node);
            cellMap.set(key, list);
        });

        const clusterRepSet = new Set<string>();
        if (clampedZoom >= 13 && clampedZoom < 15) {
            cellMap.forEach(nodesInCell => {
                if (nodesInCell.length < 3) return;
                const sorted = [...nodesInCell].sort((a, b) => {
                    const aCount = hubDetails[a.id]?.member_count || 0;
                    const bCount = hubDetails[b.id]?.member_count || 0;
                    if (aCount !== bCount) return bCount - aCount;
                    return a.id.localeCompare(b.id);
                });
                clusterRepSet.add(sorted[0].id);
            });
        }

        const priorityWeight: Record<NodePriority, number> = {
            hub: 1000,
            transfer: 700,
            cluster: 400,
            single: 100
        };

        const candidates = visibleNodes.map(node => {
            const details = hubDetails[node.id];
            const memberCount = details?.member_count || 0;
            const transferComplexity = details?.transfer_complexity;
            const isExplicitHub = node.is_hub === true || node.parent_hub_id === null;
            const isImportantHub = isExplicitHub && (memberCount >= 4 || node.tier === 'major');
            const isTransfer = isExplicitHub && (memberCount >= 2 || transferComplexity === 'high' || transferComplexity === 'complex' || (clampedZoom >= 13 && clampedZoom < 15));
            const isClusterRep = clusterRepSet.has(node.id);

            let priority: NodePriority = 'single';
            if (isImportantHub) priority = 'hub';
            else if (isTransfer) priority = 'transfer';
            else if (isClusterRep) priority = 'cluster';

            const score = priorityWeight[priority] + memberCount * 10 + (selectedIds.has(node.id) ? 5000 : 0);
            return { node, priority, score };
        });

        const zoomAllowsPriority = (priority: NodePriority) => {
            if (clampedZoom < 13) return priority === 'hub';
            if (clampedZoom < 15) return priority !== 'single';
            return true;
        };

        const forced = new Set<string>();
        candidates.forEach(c => {
            if (c.priority === 'hub') forced.add(c.node.id);
        });
        selectedIds.forEach(id => forced.add(id));

        const cap = getLabelCapForZoom(clampedZoom);

        const sorted = candidates
            .filter(c => zoomAllowsPriority(c.priority) && !forced.has(c.node.id))
            .sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.node.id.localeCompare(b.node.id);
            });

        const labelIds = new Set<string>(forced);
        for (const c of sorted) {
            if (labelIds.size >= cap) break;
            labelIds.add(c.node.id);
        }

        return labelIds;
    }, [visibleNodes, hubDetails, clampedZoom, currentNodeId, expandedHubId, expandedNodeIds]);

    const markers = visibleNodes.map((node) => {
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
                showLabelOverride={labelSet.has(node.id)}
            />
        );
    });

    if (enableClustering) {
        return (
            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
            >
                {markers}
            </MarkerClusterGroup>
        );
    }

    return <>{markers}</>;
}
