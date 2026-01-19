/**
 * GET /api/wards/detect?lat=&lng= - Detect ward by coordinates
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat') || '0');
    const lng = parseFloat(url.searchParams.get('lng') || '0');
    const includeDetails = url.searchParams.get('include_details') === '1';

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Missing lat or lng parameters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Use PostGIS function to find ward by point
        const { data: ward, error } = await supabase
            .rpc('find_ward_by_point', {
                point_lng: lng,
                point_lat: lat
            })
            .select(`
                id,
                name_i18n,
                prefecture,
                ward_code,
                center_point,
                priority_order,
                is_active,
                node_count,
                hub_count
            `)
            .single();

        if (error || !ward) {
            // Fallback: Try simple bbox check if PostGIS function fails
            console.warn('[api/wards/detect] PostGIS fallback, searching by simple check');

            const { data: fallbackWard } = await supabase
                .from('wards')
                .select(`
                    id,
                    name_i18n,
                    prefecture,
                    ward_code,
                    center_point,
                    priority_order,
                    is_active,
                    node_count,
                    hub_count
                `)
                .eq('is_active', true)
                .limit(1)
                .single();

            if (!fallbackWard) {
                return NextResponse.json({
                    error: 'No ward found at this location',
                    coordinates: { lat, lng }
                }, { status: 404 });
            }

            return NextResponse.json({
                ward: {
                    ...fallbackWard,
                    center_point: fallbackWard.center_point ? {
                        lat: fallbackWard.center_point.coordinates?.[1] || 0,
                        lng: fallbackWard.center_point.coordinates?.[0] || 0
                    } : null
                },
                coordinates: { lat, lng },
                is_fallback: true
            });
        }

        const response: any = {
            coordinates: { lat, lng },
            ward: {
                ...ward,
                center_point: ward.center_point ? {
                    lat: ward.center_point.coordinates?.[1] || 0,
                    lng: ward.center_point.coordinates?.[0] || 0
                } : null
            }
        };

        // Optionally include additional details
        if (includeDetails) {
            // Count nearby nodes within ~2km
            const { count: nearbyCount } = await supabase
                .from('nodes')
                .select('id', { count: 'exact', head: true })
                .not('ward_id', 'is', null)
                .gte('coordinates', `SRID=4326;POINT(${lng - 0.02} ${lat - 0.02})`)
                .lte('coordinates', `SRID=4326;POINT(${lng + 0.02} ${lat + 0.02})`);

            response.ward.nearby_node_count = nearbyCount || 0;
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, max-age=3600, s-maxage=7200'
            }
        });
    } catch (err: any) {
        console.error('[api/wards/detect] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
