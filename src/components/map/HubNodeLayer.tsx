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
    zoom: number; // [NEW] Accept zoom from parent
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
    enableClustering = false,
    zoom
}: HubNodeLayerProps) {

    const map = useMap();
    // [PERF] Track viewport bounds for culling
    const [boundsVersion, setBoundsVersion] = useState(0);

    // [PERF] Update bounds version on map movement to trigger re-filtering
    // Zoom tracking removed (handled by parent)
    useMapEvents({
        moveend: () => {
            setBoundsVersion(v => v + 1);
        }
    });

    const clampedZoom = clamp(zoom, 1, 22);
    // [PERF] Quantize zoom to integer to reduce re-renders of NodeMarkers
    // NodeMarker only cares about integer thresholds (12, 14, 15, etc)
    const quantizedZoom = Math.floor(clampedZoom);

    const maxNodes = getMaxNodesForZoom(quantizedZoom);

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

        // [New] SKILL.md Logic: simple check against min_zoom_level
        // Tier 1 (Super Hub): min_zoom 1
        // Tier 2 (Major Hub): min_zoom 12
        // Tier 3 (Minor Hub): min_zoom 14
        // Tier 4 (Regular): min_zoom 15
        // Tier 5 (Local): min_zoom 16

        // Exception: Always show selected nodes and their families
        return nodes.filter(n => {
            // 1. Must be active
            const isActive = (n as any).is_active ?? (n as any).hierarchy?.is_active ?? true;
            if (isActive === false) return false;

            // 2. Always show nodes related to current selection (Override)
            if (n.id === currentNodeId) return true;
            if (n.parent_hub_id === expandedHubId) return true; // Children of expanded
            if (n.id === expandedHubId) return true;            // The expanded hub itself
            if (expandedSet && expandedSet.has(n.id)) return true;

            // 3. Viewport Check (Performance)
            const [lon, lat] = n.location.coordinates;
            if (lat < viewportBounds.swLat || lat > viewportBounds.neLat ||
                lon < viewportBounds.swLng || lon > viewportBounds.neLng) {
                return false;
            }

            // 4. Force Show All Mode (e.g. Ward Mode)
            if (showAllNodes) return true;

            // 5. [Core Logic] Display Tier Check
            // Use DB min_zoom_level if available, otherwise fallback logic
            if (n.min_zoom_level && clampedZoom >= n.min_zoom_level) {
                return true;
            }

            // Fallback for legacy nodes (display_tier 5 assumed if missing)
            // If display_tier is missing, it defaults to 5 (Zoom 16+)
            // But we already set defaults in normalization.
            // Double check logic:
            if (!n.min_zoom_level) {
                // Legacy Fallback (should normally be covered by normalization)
                if (clampedZoom >= 16) return true;
            }

            return false;
        });

        // Sorting: Prioritize Tier 1 > Tier 2 > Others
        // And always keep selected on top.
    }, [nodes, showAllNodes, viewportBounds, expandedHubId, expandedNodeIds, currentNodeId, clampedZoom]);

    // Sort logic removed from here as filter handles visibility directly. 
    // Marker render order can be handled by Z-index if needed.
    // However, we might want to ensure 'visibleNodes' is sorted by importance for rendering order (render important last to be on top).
    // Let's create a sorted version for rendering:

    const sortedVisibleNodes = useMemo(() => {
        return [...visibleNodes].sort((a, b) => {
            // Lower Tier (1) is more important, should be rendered LAST (on top) in some map engines, 
            // BUT in React Leaflet, we use zIndexOffset. 
            // Let's just sort by Tier for consistency.
            const tierA = a.display_tier || 5;
            const tierB = b.display_tier || 5;
            if (tierA !== tierB) return tierB - tierA; // Render 5 first (bottom), 1 last (top) ?
            // actually default render order is array order. Last is top.
            // So higher importance (lower tier number) should be later in array.
            return tierB - tierA;
        });
    }, [visibleNodes]);

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
            // [SKILL ALIGNMENT] Use display_tier <= 2 for aggregation priority
            const isImportantHub = isExplicitHub && (node.display_tier !== undefined ? node.display_tier <= 2 : (memberCount >= 4 || (node as any).tier === 'major'));
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
    }, [visibleNodes, hubDetails, currentNodeId, expandedHubId, expandedNodeIds, clampedZoom]);

    // [FIX] Separate Tier 1-2 nodes so they are never clustered
    const tier1And2Markers = sortedVisibleNodes
        .filter(node => node.display_tier && node.display_tier <= 2)
        .map((node) => {
            const details = hubDetails[node.id];
            return (
                <NodeMarker
                    key={node.id}
                    node={node}
                    hubDetails={details}
                    zone={zone}
                    locale={locale}
                    zoom={quantizedZoom}
                    isSelected={node.id === currentNodeId || (expandedHubId !== null && node.id === expandedHubId)}
                    showLabelOverride={labelSet.has(node.id)}
                    crowdLevel={node.crowd_level}
                    disruptionStatus={node.disruption_status}
                />
            );
        });

    const otherMarkers = sortedVisibleNodes
        .filter(node => !node.display_tier || node.display_tier > 2)
        .map((node) => {
            const details = hubDetails[node.id];
            return (
                <NodeMarker
                    key={node.id}
                    node={node}
                    hubDetails={details}
                    zone={zone}
                    locale={locale}
                    zoom={quantizedZoom}
                    isSelected={node.id === currentNodeId || (expandedHubId !== null && node.id === expandedHubId)}
                    showLabelOverride={labelSet.has(node.id)}
                    crowdLevel={node.crowd_level}
                    disruptionStatus={node.disruption_status}
                />
            );
        });

    if (enableClustering) {
        return (
            <>
                {/* Tier 1-2: Never clustered, always visible */}
                {tier1And2Markers}
                {/* Tier 3-5: Clustered */}
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                >
                    {otherMarkers}
                </MarkerClusterGroup>
            </>
        );
    }

    return <>{[...tier1And2Markers, ...otherMarkers]}</>;
}
