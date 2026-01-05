import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// PUT /api/admin/l1/places/[id]/approve - Approve a place
export async function PUT(
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

        // Get current user from auth context (in real implementation)
        // For now, we'll use a service role and record the approval
        const { data: place, error } = await supabase
            .from('l1_custom_places')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API] Error approving place:', error);
            return NextResponse.json(
                { error: 'Failed to approve place', message: error.message },
                { status: 500 }
            );
        }

        if (!place) {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Place approved successfully',
            place,
        });
    } catch (error: any) {
        console.error('[API] Error approving place:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
