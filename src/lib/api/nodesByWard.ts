
import { NodeDatum } from './nodes';

export async function fetchNodesByWard(wardId: string): Promise<NodeDatum[]> {
    if (!wardId) return [];

    try {
        const res = await fetch(`/api/wards/${wardId}?include_nodes=1&include_hubs=1&limit=200`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            console.error(`Failed to fetch nodes for ward ${wardId}: ${res.status}`);
            return [];
        }

        const data = await res.json();

        // Merge nodes and hubs into a unified list or return just nodes
        // The API returns: { ward: {}, nodes: [], hubs: [] }
        // We want to return NodeDatum[] for the map

        // Strategy: Use 'hubs' array if available as it contains the primary nodes we want to show
        // But 'hubs' structure in API is hub_metadata, might need adaptation.
        // Let's use 'nodes' array which is the standard node list but filter for hubs logic.

        const nodes = data.nodes || [];

        // Return all nodes, do not filter by parent_hub_id
        // We want to show the complete node structure in ward mode
        return nodes.map((n: any) => ({
            ...n,
            location: n.coordinates ? { type: 'Point', coordinates: [n.coordinates.lng, n.coordinates.lat] } : n.location,
            type: n.node_type || 'station'
        }));
    } catch (err) {
        console.error('Error in fetchNodesByWard:', err);
        return [];
    }
}
