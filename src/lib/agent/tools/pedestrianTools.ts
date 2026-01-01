import { ITool, IToolContext } from './types';
import { AgentLevel } from '../core/types';
import { supabase } from '@/lib/supabase';

/**
 * Tool for AI Agents to retrieve pedestrian network context.
 * 
 * Strategy:
 * 1. Tries to call the optimized PostgreSQL function `get_nearby_accessibility_graph`.
 * 2. If that function is missing (migration not run), falls back to a bounding-box query.
 */
export class PedestrianAccessibilityTool implements ITool {
    id = 'pedestrian_accessibility';
    name = 'Pedestrian Accessibility Scanner';
    description = 'Scans nearby pedestrian network for accessible paths, elevators, and facilities. Input: { lat, lon, radius? }';
    requiredLevel = AgentLevel.L3_FACILITY; 

    async execute(params: { lat: number; lon: number; radius?: number }, context: IToolContext): Promise<any> {
        const lat = params.lat;
        const lon = params.lon;
        const radius = params.radius || 100; // default 100m

        try {
            // 1. Try Optimized RPC Call (Best Performance)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_nearby_accessibility_graph', {
                query_lat: lat,
                query_lon: lon,
                radius_meters: radius
            });

            if (!rpcError && rpcData) {
                return {
                    source: 'optimized_rpc',
                    count: (rpcData as any[]).length,
                    data: rpcData
                };
            }

            console.warn('PedestrianAccessibilityTool: RPC failed or missing, falling back to client query.', rpcError?.message);

            // 2. Fallback: Client-side Bounding Box Query (Robustness)
            // 1 degree lat ~= 111km. 100m ~= 0.001 degrees (roughly)
            const delta = (radius / 111000) * 1.5; // 1.5x buffer
            const minLat = lat - delta;
            const maxLat = lat + delta;
            const minLon = lon - delta;
            const maxLon = lon + delta;

            // Fetch Nodes
            const { data: nodes } = await supabase
                .from('pedestrian_nodes')
                .select('node_id, lat, lon, floor_level, is_indoor, station_id')
                .gte('lat', minLat)
                .lte('lat', maxLat)
                .gte('lon', minLon)
                .lte('lon', maxLon)
                .limit(30);

            if (!nodes || nodes.length === 0) {
                return { source: 'fallback', data: [], message: 'No nodes found nearby' };
            }

            const nodeIds = nodes.map(n => n.node_id);

            // Fetch Links connected to these nodes
            // Note: geometry column might be returned as hex string, so we skip it in fallback to save bandwidth/complexity
            // unless we specifically need it. The Agent mainly needs connectivity info.
            const { data: links } = await supabase
                .from('pedestrian_links')
                .select('link_id, start_node_id, end_node_id, distance_meters, has_elevator_access, has_braille_tiles, accessibility_rank')
                .in('start_node_id', nodeIds)
                .limit(50);
                
            // Format for LLM
            const formattedData = [
                ...(nodes.map(n => ({
                    id: n.node_id,
                    type: 'node',
                    description: `Node ${n.node_id} at ${n.floor_level}F. ${n.is_indoor ? 'Indoor' : 'Outdoor'}. Station: ${n.station_id || 'None'}`,
                    coordinates: { lat: n.lat, lon: n.lon }
                }))),
                ...(links?.map(l => ({
                    id: l.link_id,
                    type: 'link',
                description: `Path to ${l.end_node_id}. Dist: ${l.distance_meters}m. ${l.has_elevator_access ? 'Has Elevator.' : ''} ${l.has_braille_tiles ? 'Braille.' : ''} Rank: ${l.accessibility_rank}`,
                // Geometry is WKB hex in fallback, skipping to save tokens. Connectivity is inferred from start/end nodes.
            })) || [])
            ];

            return {
                source: 'fallback_client_query',
                warning: 'Database function get_nearby_accessibility_graph not found. Using slower fallback.',
                data: formattedData
            };
        } catch (e) {
            return { error: `Tool execution failed: ${(e as Error).message}` };
        }
    }
}
