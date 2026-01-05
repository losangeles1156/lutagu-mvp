import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { CreatePartnerRequest, UpdatePartnerRequest } from '@/lib/types/l1-admin';

// GET /api/admin/l1/partners - List partners
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const supabase = getSupabaseAdmin();

        const status = searchParams.get('status');
        const search = searchParams.get('search');

        // Build query
        let query = supabase
            .from('l1_partners')
            .select('*', { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,name_ja.ilike.%${search}%,name_en.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data: partners, error, count } = await query;

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch partners', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            partners: partners || [],
            total: count || 0,
        });
    } catch (error: any) {
        console.error('[API] Error fetching partners:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// POST /api/admin/l1/partners - Create a new partner
export async function POST(request: NextRequest) {
    try {
        const body: CreatePartnerRequest = await request.json();
        const supabase = getSupabaseAdmin();

        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
                { error: 'Partner name is required' },
                { status: 400 }
            );
        }

        const { data: partner, error } = await supabase
            .from('l1_partners')
            .insert({
                name: body.name,
                name_ja: body.name_ja,
                name_en: body.name_en,
                contact_email: body.contact_email,
                contact_phone: body.contact_phone,
                website_url: body.website_url,
                commission_rate: body.commission_rate,
                affiliate_code: body.affiliate_code,
                status: body.status || 'active',
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Error creating partner:', error);
            return NextResponse.json(
                { error: 'Failed to create partner', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ partner }, { status: 201 });
    } catch (error: any) {
        console.error('[API] Error creating partner:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/l1/partners - Update partner via query param
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Partner ID is required' },
                { status: 400 }
            );
        }

        const body: UpdatePartnerRequest = await request.json();
        const supabase = getSupabaseAdmin();

        const { data: partner, error } = await supabase
            .from('l1_partners')
            .update({
                name: body.name,
                name_ja: body.name_ja,
                name_en: body.name_en,
                contact_email: body.contact_email,
                contact_phone: body.contact_phone,
                website_url: body.website_url,
                commission_rate: body.commission_rate,
                affiliate_code: body.affiliate_code,
                status: body.status,
            })
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

// DELETE /api/admin/l1/partners - Delete partner via query param
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Partner ID is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

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
