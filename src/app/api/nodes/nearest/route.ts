import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * GET /api/nodes/nearest
 * Find the nearest node to a given lat/lon coordinate
 *
 * Query params:
 * - lat: latitude (required)
 * - lon: longitude (required)
 * - limit: max results (optional, default 1)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    const limit = parseInt(searchParams.get('limit') || '1', 10);

    if (isNaN(lat) || isNaN(lon)) {
        return NextResponse.json(
            { error: 'lat and lon are required query parameters' },
            { status: 400 }
        );
    }

    try {
        const supabase = getSupabase();

        // Use PostGIS ST_Distance to find nearest active node
        const { data, error } = await supabase
            .rpc('nearby_nodes_v2', {
                user_lat: lat,
                user_lon: lon,
                radius_meters: 5000, // 5km search radius
                max_results: limit
            });

        if (error) {
            console.error('Error fetching nearest node:', error);
            return NextResponse.json(
                { error: 'Failed to fetch nearest node' },
                { status: 500 }
            );
        }

        if (!data || data.length === 0) {
            // No nearby nodes found, return default Ueno
            return NextResponse.json({
                node: {
                    id: 'odpt.Station:TokyoMetro.Ginza.Ueno',
                    name: { en: 'Ueno', ja: '上野', zh: '上野' },
                    coordinates: { lat: 35.7141, lon: 139.7774 }
                },
                isDefault: true
            });
        }

        const nearest = data[0];
        return NextResponse.json({
            node: {
                id: nearest.id,
                name: nearest.name,
                coordinates: nearest.coordinates
            },
            distance: nearest.distance_meters,
            isDefault: false
        });

    } catch (err) {
        console.error('Error in nearest node API:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
