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

    // Mock Override for Ueno (Demo)
    if (nodeId.includes('Ueno')) {
        const mockProfile = {
            node_id: nodeId,
            category_counts: { shopping: 85, dining: 90, leisure: 88, culture: 75, transport: 95, nightlife: 80 },
            vibe_tags: ['#阿美橫町', '#居酒屋天國', '#熊貓', '#美術館巡禮', '#下町風情', '#交通樞紐'],
            dominant_category: 'shopping',
            total_count: 350
        };
        // Use mock profile if DB return is null (or always for demo consistency)
        if (!profile) return { node, profile: mockProfile, error: null };
        // Optional: Force overwrite even if DB has data? For safety let's favor DB if present, but here we cover the "not pushed" case.
        return { node, profile: mockProfile, error: null };
    }

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

// Fetch ALL nodes for manual map exploration (Using large radius from Tokyo center)
export async function fetchAllNodes() {
    // 35.6895, 139.6917 is Tokyo Station
    // 50000 meters = 50km radius covers all of Tokyo + suburbs
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: 35.6895,
            user_lon: 139.6917,
            radius_meters: 50000
        });

    if (error) {
        console.error('Error fetching all nodes:', error);
        return [];
    }
    return data as NodeDatum[];
}
