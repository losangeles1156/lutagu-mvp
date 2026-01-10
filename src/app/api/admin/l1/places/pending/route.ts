import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mark as dynamic to prevent static generation error
// "Route couldn't be rendered statically because it used `request.url`"
export const dynamic = 'force-dynamic';

// GET /api/admin/l1/places/pending - 獲取待審核的 L1 數據
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const supabase = getSupabaseAdmin();

        const stationId = searchParams.get('station_id') || undefined;
        const category = searchParams.get('category') || undefined;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // 構建查詢
        let query = supabase
            .from('v_l1_pending')
            .select('*', { count: 'exact' });

        if (stationId) {
            query = query.eq('node_id', stationId);
        }

        if (category) {
            query = query.eq('category', category);
        }

        // 分頁
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query
            .order('category')
            .order('name')
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('[API] Error fetching pending places:', error);
            return NextResponse.json(
                { error: 'Failed to fetch pending places', message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            places: data || [],
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit),
        });
    } catch (error: any) {
        console.error('[API] Error in GET pending places:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
