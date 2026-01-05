import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { CreatePlaceRequest, UpdatePlaceRequest, PlaceQueryParams } from '@/lib/types/l1-admin';

// GET /api/admin/l1/places - List places with filtering
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const supabase = getSupabaseAdmin();

        // Parse query parameters
        const params: PlaceQueryParams = {
            station_id: searchParams.get('station_id') || undefined,
            category: searchParams.get('category') || undefined,
            status: searchParams.get('status') as any || undefined,
            is_partner: searchParams.get('is_partner') === 'true' ? true : undefined,
            partner_id: searchParams.get('partner_id') || undefined,
            is_active: searchParams.get('is_active') === 'true' ? true : undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
            order_by: searchParams.get('order_by') || 'created_at',
            order_dir: (searchParams.get('order_dir') || 'desc') as 'asc' | 'desc',
        };

        // Build query
        let query = supabase
            .from('l1_custom_places')
            .select('*', { count: 'exact' });

        // Apply filters
        if (params.station_id) {
            query = query.eq('station_id', params.station_id);
        }
        if (params.category) {
            query = query.eq('category', params.category);
        }
        if (params.status) {
            query = query.eq('status', params.status);
        }
        if (params.is_partner !== undefined) {
            query = query.eq('is_partner', params.is_partner);
        }
        if (params.partner_id) {
            query = query.eq('partner_id', params.partner_id);
        }
        if (params.is_active !== undefined) {
            query = query.eq('is_active', params.is_active);
        }

        // Apply ordering and pagination
        const pageNum = params.page || 1;
        const limitNum = params.limit || 20;
        const orderField = params.order_by || 'created_at';
        const orderDirection = params.order_dir === 'asc';
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        query = query
            .order(orderField, { ascending: orderDirection })
            .range(from, to);

        const { data: places, error, count } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch places', message: error.message },
                { status: 500 }
            );
        }

        // Transform location from geography to lat/lng object
        const transformedPlaces = (places || []).map((place: any) => ({
            ...place,
            location: place.location
                ? { lat: place.location.y, lng: place.location.x }
                : null,
        }));

        return NextResponse.json({
            places: transformedPlaces,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            total_pages: Math.ceil((count || 0) / limitNum),
        });
    } catch (error: any) {
        console.error('[API] Error fetching places:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// POST /api/admin/l1/places - Create a new place
export async function POST(request: NextRequest) {
    try {
        const body: CreatePlaceRequest = await request.json();
        const supabase = getSupabaseAdmin();

        // Validate required fields
        if (!body.station_id || !body.name_i18n || !body.category) {
            return NextResponse.json(
                { error: 'Missing required fields', details: { station_id: !body.station_id, name_i18n: !body.name_i18n, category: !body.category } },
                { status: 400 }
            );
        }

        // Prepare data for insertion
        const insertData: any = {
            station_id: body.station_id,
            name_i18n: body.name_i18n,
            description_i18n: body.description_i18n || {},
            category: body.category,
            subcategory: body.subcategory,
            address: body.address,
            is_partner: body.is_partner ?? true,
            partner_id: body.partner_id,
            affiliate_url: body.affiliate_url,
            discount_info: body.discount_info,
            business_hours: body.business_hours,
            image_urls: body.image_urls || [],
            logo_url: body.logo_url,
            priority: body.priority ?? 100,
            expires_at: body.expires_at,
            status: body.status || 'draft',
        };

        // Convert location to PostGIS format if provided
        if (body.location) {
            insertData.location = `SRID=4326;POINT(${body.location.lng} ${body.location.lat})`;
        }

        const { data: place, error } = await supabase
            .from('l1_custom_places')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating place:', error);
            return NextResponse.json(
                { error: 'Failed to create place', message: error.message },
                { status: 500 }
            );
        }

        // Transform location
        const transformedPlace = {
            ...place,
            location: place.location
                ? { lat: place.location.y, lng: place.location.x }
                : null,
        };

        return NextResponse.json({ place: transformedPlace }, { status: 201 });
    } catch (error: any) {
        console.error('[API] Error creating place:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/l1/places - Bulk update or single update via query
// For single place update, use PUT /api/admin/l1/places/[id]
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Place ID is required for PATCH requests' },
                { status: 400 }
            );
        }

        // Delegate to PUT handler
        return PUT(request, { params: Promise.resolve({ id }) });
    } catch (error: any) {
        console.error('[API] Error in PATCH places:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/l1/places/[id] - Update a place
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body: UpdatePlaceRequest = await request.json();
        const supabase = getSupabaseAdmin();

        if (!id) {
            return NextResponse.json(
                { error: 'Place ID is required' },
                { status: 400 }
            );
        }

        // Prepare data for update
        const updateData: any = { ...body };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Convert location to PostGIS format if provided
        if (updateData.location) {
            updateData.location = `SRID=4326;POINT(${updateData.location.lng} ${updateData.location.lat})`;
        }

        const { data: place, error } = await supabase
            .from('l1_custom_places')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating place:', error);
            return NextResponse.json(
                { error: 'Failed to update place', message: error.message },
                { status: 500 }
            );
        }

        if (!place) {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            );
        }

        // Transform location
        const transformedPlace = {
            ...place,
            location: place.location
                ? { lat: place.location.y, lng: place.location.x }
                : null,
        };

        return NextResponse.json({ place: transformedPlace });
    } catch (error: any) {
        console.error('[API] Error updating place:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/l1/places/[id] - Delete (soft delete) a place
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = getSupabaseAdmin();

        if (!id) {
            return NextResponse.json(
                { error: 'Place ID is required' },
                { status: 400 }
            );
        }

        // Soft delete - set is_active to false
        const { error } = await supabase
            .from('l1_custom_places')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            console.error('[API] Error deleting place:', error);
            return NextResponse.json(
                { error: 'Failed to delete place', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Place deactivated successfully' });
    } catch (error: any) {
        console.error('[API] Error deleting place:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
