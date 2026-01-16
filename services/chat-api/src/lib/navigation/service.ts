
import { supabaseAdmin } from '@/lib/supabase';

export interface GraphNode {
    id: string;
    type: string;
    description: string;
    distance_from_query: number;
    coordinates: any;
    [key: string]: any;
}

export interface GraphLink {
    id: string;
    start_node_id: string;
    end_node_id: string;
    has_elevator_access: boolean;
    accessibility_rank: string;
    distance_meters: number;
    geometry?: any;
    [key: string]: any;
}

export interface NavigationGraphResult {
    nodes: GraphNode[];
    edges: GraphLink[];
    meta: any;
    error?: string;
}

export async function getPedestrianGraph(
    lat: number,
    lon: number,
    radius: number = 500,
    userProfile: string = 'general',
    weatherCondition: string = 'clear'
): Promise<NavigationGraphResult> {
    
    // 1. Get Nodes via Optimized RPC
    const { data: mixedResults, error: nodeError } = await supabaseAdmin.rpc('get_nearby_accessibility_graph', {
        query_lat: lat,
        query_lon: lon,
        radius_meters: radius
    });

    if (nodeError) {
        console.error('RPC Error:', nodeError);
        throw new Error(`RPC Error: ${nodeError.message}`);
    }

    // Filter out links from the first RPC result, keep only nodes
    const nodes = mixedResults?.filter((item: any) => item.type === 'node') || [];
    const nodeIds = nodes.map((n: any) => n.id);

    // 2. Get Links (Edges) connecting these nodes
    let links: any[] = [];
    let linkError = null;

    if (nodeIds.length > 0) {
        // Try RPC first (GeoJSON support)
        let linksQuery = supabaseAdmin.rpc('get_pedestrian_links_geojson', {
            target_node_ids: nodeIds
        });

        // 3. Apply Agent Logic (Filtering based on Profile)
        if (userProfile === 'wheelchair' || userProfile === 'stroller') {
            linksQuery = linksQuery.eq('has_elevator_access', true);
        }

        const result = await linksQuery;
        
        if (result.error) {
             console.warn('RPC Error (get_pedestrian_links_geojson):', result.error.message);
             
             // Fallback if RPC fails (missing function OR type mismatch OR other issues)
             console.warn('Falling back to raw query (no GeoJSON).');
             const idList = nodeIds.map((id: string) => `"${id}"`).join(',');
             let fallbackQuery = supabaseAdmin
                .from('pedestrian_links')
                .select('*')
                .or(`start_node_id.in.(${idList}),end_node_id.in.(${idList})`);
             
             if (userProfile === 'wheelchair' || userProfile === 'stroller') {
                fallbackQuery = fallbackQuery.eq('has_elevator_access', true);
             }
             const fallbackResult = await fallbackQuery;
             links = fallbackResult.data || [];
             linkError = fallbackResult.error;
        } else {
            links = result.data || [];
            linkError = null;
        }
    }

    if (linkError) {
        console.warn('Link fetch error:', linkError);
    }

    // 4. Agent Reasoning Synthesis
    const reasoning = [];
    if (userProfile !== 'general') {
        reasoning.push(`Filtered for ${userProfile}: Excluded non-elevator paths.`);
    }
    if (weatherCondition === 'rain') {
        reasoning.push(`Weather Alert: Prioritizing indoor connections in weighting (client-side).`);
    }
    
    // 5. Calculate Metrics
    const nodeCount = nodes ? nodes.length : 0;
    const linkCount = links ? links.length : 0;
    const connectivityRatio = nodeCount > 0 ? (linkCount / nodeCount).toFixed(2) : '0';

    // Add Traceability Meta
    const meta = {
        query_params: { lat, lon, radius, user_profile: userProfile, weather: weatherCondition },
        source: 'get_nearby_accessibility_graph + pedestrian_links',
        timestamp: new Date().toISOString(),
        stats: {
            node_count: nodeCount,
            edge_count: linkCount,
            connectivity_ratio: connectivityRatio
        },
        agent_reasoning: reasoning,
        performance_note: 'Uses KNN spatial indexing + Dynamic Edge Filtering'
    };

    return {
        nodes: nodes || [],
        edges: links || [],
        meta
    };
}
