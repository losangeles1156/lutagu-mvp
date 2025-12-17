import { supabase } from '../supabase';
import { CategoryCounts } from '../nodes/facilityProfileCalculator';

// Types aligning with DB schema
export interface NodeDatum {
    id: string;
    city_id: string;
    name: any;
    type: string;
    location: any; // PostGIS Point or GeoJSON
    geohash: string;
    vibe: string | null;
    is_hub: boolean;
    parent_hub_id: string | null;
    zone: string;
}

export interface FacilityProfile {
    node_id: string;
    category_counts: CategoryCounts;
    vibe_tags: string[];
    dominant_category: string | null;
    total_count: number;
}

// Fetch nearby nodes
export async function fetchNearbyNodes(lat: number, lon: number, radiusMeters: number = 2000) {
    // Uses the 'nearby_nodes' RPC function created in migration 10
    // We expect the RPC to return columns matching NodeDatum roughly
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: lat,
            user_lon: lon,
            radius_meters: radiusMeters
        });

    if (error) {
        console.error('Error fetching nearby nodes:', error);
        return [];
    }

    return data as NodeDatum[];
}

// Fetch single node with profile
export async function fetchNodeConfig(nodeId: string) {
    const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

    if (nodeError) return { node: null, profile: null, error: nodeError };

    const { data: profile, error: profileError } = await supabase
        .from('node_facility_profiles')
        .select('*')
        .eq('node_id', nodeId)
        .single();

    // Profile might handle error gracefully (not all nodes have profiles)

    return { node, profile, error: null };
}

// Fetch logic for specific zones (e.g., get all Hubs in a city)
export async function fetchCityHubs(cityId: string) {
    const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('city_id', cityId)
        .eq('is_hub', true);

    if (error) {
        console.error('Error fetching city hubs:', error);
        return [];
    }
    return data;
}
