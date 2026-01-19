import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { UpdatePartnerRequest } from '@/lib/types/l1-admin';

// GET /api/admin/l1/partners/[id] - Get a single partner
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
        try {
            const { id } = await params;
            const supabase = getSupabaseAdmin();
            if (!supabase) {
                return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
            }

            const { data: partner, error } = await supabase
            .from('l1_partners')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Partner not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: 'Failed to fetch partner', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ partner });
    } catch (error: any) {
        console.error('[API] Error fetching partner:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/l1/partners/[id] - Update a partner
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body: UpdatePartnerRequest = await request.json();
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        // Prepare data for update
        const updateData: any = { ...body };

        // Remove undefined values
        Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const { data: partner, error } = await supabase
            .from('l1_partners')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API] Error updating partner:', error);
            return NextResponse.json(
                { error: 'Failed to update partner', message: error.message },
                { status: 500 }
            );
        }

        if (!partner) {
            return NextResponse.json(
                { error: 'Partner not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ partner });
    } catch (error: any) {
        console.error('[API] Error updating partner:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/l1/partners/[id] - Delete a partner
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        const { error } = await supabase
            .from('l1_partners')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API] Error deleting partner:', error);
            return NextResponse.json(
                { error: 'Failed to delete partner', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Partner deleted successfully' });
    } catch (error: any) {
        console.error('[API] Error deleting partner:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
