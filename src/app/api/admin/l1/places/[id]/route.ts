import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { UpdatePlaceRequest } from '@/lib/types/l1-admin';

// GET /api/admin/l1/places/[id] - Get a single place
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = getSupabaseAdmin();

        if (!id) {
            return NextResponse.json(
                { error: 'Place ID is required' },
                { status: 400 }
            );
        }

        const { data: place, error } = await supabase
            .from('l1_custom_places')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Place not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: 'Failed to fetch place', message: error.message },
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

        return NextResponse.json({ place: transformedPlace });
    } catch (error: any) {
        console.error('[API] Error fetching place:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/l1/places/[id] - Update a place
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
