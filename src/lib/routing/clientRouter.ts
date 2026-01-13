
// Client-Side Routing Utility (Dijkstra)
// Optimized for browser usage with pre-computed adjacency graph.

type Edge = { cost: number; railwayId: string };
type AdjacencyList = Record<string, Record<string, Edge>>;
type RoutingGraph = {
    meta: { version: string };
    adj: AdjacencyList; // { [from]: { [to]: Edge } }
};

interface PathResult {
    path: string[];
    totalCost: number;
    legs: Array<{ from: string; to: string; railwayId: string; cost: number }>;
}

class ClientRouter {
    private static graph: AdjacencyList | null = null;
    private static isLoading = false;

    /**
     * Loads the graph from public JSON if not already loaded.
     */
    static async loadGraph(): Promise<void> {
        if (this.graph || this.isLoading) return;
        this.isLoading = true;

        try {
            console.log('[ClientRouter] Fetching routing graph...');
            const res = await fetch('/data/routing_graph.json');
            if (!res.ok) throw new Error('Failed to load graph');

            const data: RoutingGraph = await res.json();
            this.graph = data.adj;
            console.log(`[ClientRouter] Graph loaded. Nodes: ${Object.keys(this.graph).length}`);
        } catch (e) {
            console.error('[ClientRouter] Graph load error', e);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Finds the shortest path using Dijkstra's Algorithm.
     */
    static async findPath(startId: string, endId: string): Promise<PathResult | null> {
        if (!this.graph) await this.loadGraph();
        if (!this.graph) return null;

        // Dijkstra Setup
        const distances: Record<string, number> = {};
        const previous: Record<string, { node: string; edge: Edge }> = {};
        const queue: Set<string> = new Set();

        // Init
        for (const node of Object.keys(this.graph)) {
            distances[node] = Infinity;
            queue.add(node);
        }
        distances[startId] = 0;

        // Run
        while (queue.size > 0) {
            // Find simpler Min-Priority Queue implementation via linear scan (adequate for < 2000 nodes)
            let minNode: string | null = null;
            let minCost = Infinity;

            for (const node of queue) {
                if (distances[node] < minCost) {
                    minCost = distances[node];
                    minNode = node;
                }
            }

            if (!minNode || distances[minNode] === Infinity) break;
            if (minNode === endId) break;

            queue.delete(minNode);

            const neighbors = this.graph[minNode] || {};
            for (const [neighbor, edge] of Object.entries(neighbors)) {
                if (!queue.has(neighbor)) continue;

                const alt = distances[minNode] + edge.cost;
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = { node: minNode, edge };
                }
            }
        }

        // Reconstruct Path
        if (distances[endId] === Infinity) return null;

        const path: string[] = [];
        const legs: PathResult['legs'] = [];
        let curr = endId;

        while (curr !== startId) {
            path.unshift(curr);
            const prev = previous[curr];
            if (!prev) return null; // Should not happen

            legs.unshift({
                from: prev.node,
                to: curr,
                railwayId: prev.edge.railwayId,
                cost: prev.edge.cost
            });
            curr = prev.node;
        }
        path.unshift(startId);

        return {
            path,
            totalCost: distances[endId],
            legs
        };
    }
}

export default ClientRouter;
