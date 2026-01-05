import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get('stationId');
        const category = searchParams.get('category');
        const includePartnerOnly = searchParams.get('includePartnerOnly') === 'true';

        if (!stationId) {
            return NextResponse.json(
                { error: 'stationId is required' },
                { status: 400 }
            );
        }

        // 構建查詢
        let query = supabase
            .from('l1_custom_places')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'approved');

        // 站點過濾
        if (stationId.includes(',')) {
            const stationIds = stationId.split(',');
            query = query.in('station_id', stationIds);
        } else {
            query = query.eq('station_id', stationId);
        }

        // 分類過濾
        if (category) {
            query = query.eq('category', category);
        }

        // 只顯示合作店家
        if (includePartnerOnly) {
            query = query.eq('is_partner', true);
        }

        const { data, error } = await query.order('priority', { ascending: false });

        if (error) {
            console.error('[API/l1/places] Error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        // 格式化返回數據
        const places = (data || []).map(row => ({
            id: row.id,
            name: row.name_i18n?.zh || row.name_i18n?.ja || row.name_i18n?.en || row.name,
            name_i18n: row.name_i18n,
            category: row.category,
            subcategory: row.subcategory,
            location: {
                lat: row.location?.coordinates?.[1] || 0,
                lng: row.location?.coordinates?.[0] || 0
            },
            isPartner: row.is_partner || false,
            affiliateUrl: row.affiliate_url,
            discountInfo: row.discount_info,
            businessHours: row.business_hours,
            logoUrl: row.logo_url,
            priority: row.priority
        }));

        return NextResponse.json({ places });
    } catch (err) {
        console.error('[API/l1/places] Error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
