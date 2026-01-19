
import { supabaseAdmin } from '@/lib/supabase';
import { getNodeCoordinates } from '@/lib/utils/geoUtils';

export interface GraphNode {
    id: string;
    type: string;
    description: string;
    distance_from_query: number;
    coordinates: any;
}

export interface GraphLink {
    id: string;
    link_id: string;
    start_node_id: string;
    end_node_id: string;
    has_elevator_access: boolean;
    accessibility_rank: string;
    distance_meters: number;
    geometry?: any;
}

export interface NavigationGraphResult {
    nodes: GraphNode[];
    edges: GraphLink[];
    meta: {
        center: { lat: number; lon: number };
        radius: number;
        userProfile: string;
        weather: string;
        timestamp: string;
    };
    reasoning?: string[];
}

export interface RouteNode {
    id: string;
    lat: number;
    lon: number;
    order: number;
}

export interface RouteEdge {
    id: string;
    link_id: string;
    start_node_id: string;
    end_node_id: string;
    distance_meters: number;
    geometry?: any;
}

export interface PedestrianRouteSummary {
    total_distance_meters: number;
    estimated_duration_minutes: number;
    accessibility_notes: string[];
    user_profile: string;
}

export interface PedestrianRouteResult {
    nodes: RouteNode[];
    edges: RouteEdge[];
    summary: PedestrianRouteSummary;
    meta: {
        start_node_id: string;
        end_node_id: string;
        weather: string;
        timestamp: string;
    };
}

/**
 * NavigationService
 *
 * Centralized service for pedestrian navigation and accessibility graph retrieval.
 * Used by both the Navigation API and AI Agent Tools.
 */
export class NavigationService {

    /**
     * Retrieves a pedestrian navigation graph for a specific area.
     */
    static async getPedestrianGraph(
        lat: number,
        lon: number,
        radius: number = 500,
        userProfile: string = 'general',
        weather: string = 'clear'
    ): Promise<NavigationGraphResult> {

        // 1. Get Nodes via Optimized RPC
        const { data: mixedResults, error: rpcError } = await supabaseAdmin.rpc('get_nearby_accessibility_graph', {
            query_lat: lat,
            query_lon: lon,
            radius_meters: radius
        });

        if (rpcError) {
            console.error('[NavigationService] RPC Error (get_nearby_accessibility_graph):', rpcError);
            throw new Error(`Accessibility Search Failed: ${rpcError.message}`);
        }

        // Filter nodes from mixed results
        const nodes: GraphNode[] = (mixedResults || [])
            .filter((item: any) => item.type === 'node')
            .map((n: any) => ({
                id: n.id,
                type: n.type,
                description: n.description,
                distance_from_query: n.distance_from_query,
                coordinates: n.coordinates
            }));

        const nodeIds = nodes.map(n => n.id);
        let links: GraphLink[] = [];

        // 2. Get Links connecting these nodes
        if (nodeIds.length > 0) {
            const { data: linkResults, error: linkError } = await supabaseAdmin.rpc('get_pedestrian_links_geojson', {
                target_node_ids: nodeIds
            });

            if (linkError) {
                console.warn('[NavigationService] RPC Error (get_pedestrian_links_geojson), falling back:', linkError);

                // Fallback to standard query if RPC fails
                const { data: fallbackLinks, error: fallbackError } = await supabaseAdmin
                    .from('pedestrian_links')
                    .select('*')
                    .or(`start_node_id.in.(${nodeIds.map(id => `"${id}"`).join(',')}),end_node_id.in.(${nodeIds.map(id => `"${id}"`).join(',')})`);

                if (fallbackError) {
                    console.error('[NavigationService] Fallback link query failed:', fallbackError);
                } else {
                    links = (fallbackLinks || []).map(l => ({
                        id: l.id,
                        link_id: l.link_id,
                        start_node_id: l.start_node_id,
                        end_node_id: l.end_node_id,
                        has_elevator_access: l.has_elevator_access,
                        accessibility_rank: l.accessibility_rank,
                        distance_meters: Number(l.distance_meters),
                        geometry: l.geometry // Will be WKB hex string in fallback
                    }));
                }
            } else {
                links = (linkResults || []).map((l: any) => ({
                    id: l.id,
                    link_id: l.link_id,
                    start_node_id: l.start_node_id,
                    end_node_id: l.end_node_id,
                    has_elevator_access: l.has_elevator_access,
                    accessibility_rank: l.accessibility_rank,
                    distance_meters: Number(l.distance_meters),
                    geometry: l.geometry // GeoJSON from RPC
                }));
            }
        }

        // 3. Apply Filtering Logic based on User Profile
        let filteredLinks = links;
        const reasoning: string[] = [];

        if (userProfile === 'wheelchair' || userProfile === 'stroller') {
            const beforeCount = filteredLinks.length;
            filteredLinks = filteredLinks.filter(l => l.has_elevator_access);
            const removedCount = beforeCount - filteredLinks.length;
            if (removedCount > 0) {
                reasoning.push(`Filtered out ${removedCount} non-accessible path segments for ${userProfile} profile.`);
            }
        }

        if (weather === 'rain' || weather === 'snow') {
            reasoning.push(`Weather is ${weather}. Recommend using underground passages and elevators where available.`);
        }

        return {
            nodes,
            edges: filteredLinks,
            meta: {
                center: { lat, lon },
                radius,
                userProfile,
                weather,
                timestamp: new Date().toISOString()
            },
            reasoning: reasoning.length > 0 ? reasoning : undefined
        };
    }

    static async getPedestrianRoute(params: {
        startNodeId?: string;
        endNodeId?: string;
        startLat?: number;
        startLon?: number;
        endLat?: number;
        endLon?: number;
        userProfile?: string;
        weather?: string;
        searchRadiusMeters?: number;
    }): Promise<PedestrianRouteResult> {
        const userProfile = params.userProfile || 'general';
        const weather = params.weather || 'clear';
        const searchRadius = params.searchRadiusMeters ?? 700;

        let startNodeId = params.startNodeId;
        let endNodeId = params.endNodeId;

        if ((!startNodeId || !endNodeId) && params.startLat != null && params.startLon != null && params.endLat != null && params.endLon != null) {
            const startGraph = await this.getPedestrianGraph(params.startLat, params.startLon, searchRadius, userProfile, weather);
            if (!startGraph.nodes.length) {
                throw new Error('No pedestrian nodes found near start location');
            }
            const endGraph = await this.getPedestrianGraph(params.endLat, params.endLon, searchRadius, userProfile, weather);
            if (!endGraph.nodes.length) {
                throw new Error('No pedestrian nodes found near end location');
            }

            const nearestStart = startGraph.nodes.reduce((best, node) => {
                if (!best) return node;
                return node.distance_from_query < best.distance_from_query ? node : best;
            });
            const nearestEnd = endGraph.nodes.reduce((best, node) => {
                if (!best) return node;
                return node.distance_from_query < best.distance_from_query ? node : best;
            });

            startNodeId = nearestStart.id;
            endNodeId = nearestEnd.id;
        }

        if (!startNodeId || !endNodeId) {
            throw new Error('startNodeId and endNodeId or both coordinate pairs are required');
        }

        const endpointNodes = await supabaseAdmin
            .from('pedestrian_nodes')
            .select('node_id, lat, lon')
            .in('node_id', [startNodeId, endNodeId]);

        if (endpointNodes.error) {
            throw new Error(`Failed to load route endpoints: ${endpointNodes.error.message}`);
        }

        const startRow = endpointNodes.data?.find(n => n.node_id === startNodeId);
        const endRow = endpointNodes.data?.find(n => n.node_id === endNodeId);

        if (!startRow || !endRow) {
            throw new Error('Could not resolve pedestrian nodes for routing');
        }

        const startCoords = [startRow.lat, startRow.lon];
        const endCoords = [endRow.lat, endRow.lon];

        if (startCoords[0] == null || startCoords[1] == null || endCoords[0] == null || endCoords[1] == null) {
            throw new Error('Invalid coordinates for pedestrian nodes');
        }

        const centerLat = (startCoords[0] + endCoords[0]) / 2;
        const centerLon = (startCoords[1] + endCoords[1]) / 2;

        const graph = await this.getPedestrianGraph(centerLat, centerLon, searchRadius, userProfile, weather);

        const nodesById = new Map<string, GraphNode>();
        for (const n of graph.nodes) {
            nodesById.set(n.id, n);
        }

        const adjacency = new Map<string, Array<{ to: string; edge: GraphLink }>>();
        for (const edge of graph.edges) {
            if (!adjacency.has(edge.start_node_id)) adjacency.set(edge.start_node_id, []);
            if (!adjacency.has(edge.end_node_id)) adjacency.set(edge.end_node_id, []);
            adjacency.get(edge.start_node_id)!.push({ to: edge.end_node_id, edge });
            adjacency.get(edge.end_node_id)!.push({ to: edge.start_node_id, edge });
        }

        if (!nodesById.has(startNodeId) || !nodesById.has(endNodeId)) {
            throw new Error('Start or end node is outside of the current graph window');
        }

        const distances = new Map<string, number>();
        const previous = new Map<string, { prevNodeId: string; via: GraphLink }>();
        const visited = new Set<string>();

        for (const id of nodesById.keys()) {
            distances.set(id, Number.POSITIVE_INFINITY);
        }
        distances.set(startNodeId, 0);

        while (true) {
            let currentNodeId: string | null = null;
            let currentDistance = Number.POSITIVE_INFINITY;

            for (const [id, d] of distances.entries()) {
                if (visited.has(id)) continue;
                if (d < currentDistance) {
                    currentDistance = d;
                    currentNodeId = id;
                }
            }

            if (currentNodeId === null) break;
            if (currentNodeId === endNodeId) break;

            visited.add(currentNodeId);

            const neighbors = adjacency.get(currentNodeId) || [];
            for (const { to, edge } of neighbors) {
                if (visited.has(to)) continue;
                const nextDistance = currentDistance + edge.distance_meters;
                const bestKnown = distances.get(to) ?? Number.POSITIVE_INFINITY;
                if (nextDistance < bestKnown) {
                    distances.set(to, nextDistance);
                    previous.set(to, { prevNodeId: currentNodeId, via: edge });
                }
            }
        }

        if (!previous.has(endNodeId) && startNodeId !== endNodeId) {
            throw new Error('No pedestrian route found between start and end nodes');
        }

        const pathNodeIds: string[] = [];
        const pathEdges: GraphLink[] = [];

        let cursor = endNodeId;
        pathNodeIds.push(cursor);
        while (cursor !== startNodeId) {
            const prev = previous.get(cursor);
            if (!prev) break;
            pathEdges.push(prev.via);
            cursor = prev.prevNodeId;
            pathNodeIds.push(cursor);
        }

        pathNodeIds.reverse();
        pathEdges.reverse();

        const routeNodes: RouteNode[] = pathNodeIds.map((id, index) => {
            const node = nodesById.get(id);
            const coords = node ? getNodeCoordinates(node) : null;
            return {
                id,
                lat: coords ? coords[0] : 0,
                lon: coords ? coords[1] : 0,
                order: index,
            };
        });

        const routeEdges: RouteEdge[] = pathEdges.map(edge => ({
            id: edge.id,
            link_id: edge.link_id,
            start_node_id: edge.start_node_id,
            end_node_id: edge.end_node_id,
            distance_meters: edge.distance_meters,
            geometry: edge.geometry,
        }));

        const totalDistance = routeEdges.reduce((sum, e) => sum + e.distance_meters, 0);

        let speedMetersPerMinute = 70;
        if (userProfile === 'stroller') speedMetersPerMinute = 60;
        if (userProfile === 'wheelchair') speedMetersPerMinute = 55;

        const accessibilityNotes: string[] = [];
        if (userProfile === 'wheelchair' || userProfile === 'stroller') {
            accessibilityNotes.push('Filtered to prefer elevator-accessible segments.');
        }
        if (weather === 'rain' || weather === 'snow') {
            accessibilityNotes.push('Weather conditions suggest prioritizing indoor or covered segments when possible.');
        }

        return {
            nodes: routeNodes,
            edges: routeEdges,
            summary: {
                total_distance_meters: totalDistance,
                estimated_duration_minutes: Number((totalDistance / speedMetersPerMinute).toFixed(1)),
                accessibility_notes: accessibilityNotes,
                user_profile: userProfile,
            },
            meta: {
                start_node_id: startNodeId,
                end_node_id: endNodeId,
                weather,
                timestamp: new Date().toISOString(),
            },
        };
    }
}
