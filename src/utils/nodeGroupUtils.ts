import { NodeDatum } from '@/lib/api/nodes';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export interface GroupedNode extends NodeDatum {
    children?: NodeDatum[];
    isParent?: boolean;
}

/**
 * Groups nodes by proximity for map display.
 *
 * IMPORTANT: This function now expects only parent nodes and independent stations
 * (nodes without parent_hub_id). Child nodes should be filtered out at the API level.
 *
 * The function groups nearby parent nodes together based on distance threshold,
 * which is useful for clustering at low zoom levels.
 *
 * @param nodes - Array of parent/independent nodes (no child nodes)
 * @param thresholdMeters - Distance threshold for grouping (default 200m)
 */
export function groupNodesByProximity(nodes: NodeDatum[], thresholdMeters: number = 200): GroupedNode[] {
    // FIXED: First, filter out any child nodes that might have slipped through
    // Only process nodes that are hubs or have no parent_hub_id (independent stations)
    const parentNodes = nodes.filter(node => !node.parent_hub_id);

    const hubMap = new Map<string, GroupedNode>();

    // Initialize all parent/independent nodes as group leaders
    parentNodes.forEach(node => {
        hubMap.set(node.id, { ...node, children: [], isParent: true });
    });

    // Group nearby parent nodes together for clustering display
    // This merges nearby independent stations into the nearest hub
    const processed = new Set<string>();
    const sortedNodes = Array.from(hubMap.values()).sort((a, b) => {
        // Prioritize nodes marked as is_hub over independent stations
        if (a.is_hub && !b.is_hub) return -1;
        if (!a.is_hub && b.is_hub) return 1;
        return 0;
    });

    const result: GroupedNode[] = [];

    for (const node of sortedNodes) {
        if (processed.has(node.id)) continue;

        processed.add(node.id);
        const group = { ...node, children: [] as NodeDatum[], isParent: true };

        const [lon1, lat1] = node.location.coordinates;

        // Find nearby nodes to group together (for clustering display)
        for (const candidate of sortedNodes) {
            if (processed.has(candidate.id)) continue;
            if (candidate.id === node.id) continue;

            const [lon2, lat2] = candidate.location.coordinates;
            const dist = calculateDistance(lat1, lon1, lat2, lon2);

            if (dist < thresholdMeters) {
                // Group this nearby node under the current leader
                group.children!.push(candidate);
                processed.add(candidate.id);
            }
        }

        result.push(group);
    }

    return result;
}
