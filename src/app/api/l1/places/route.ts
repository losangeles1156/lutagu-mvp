import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRateLimitService, DEFAULT_RATE_LIMITS } from '@/lib/rate-limit';

// 輔助函數：解析 PostGIS POINT 格式
function parsePointLocation(location: any): { lat: number; lng: number } {
    if (!location) return { lat: 0, lng: 0 };

    if (typeof location === 'string' && location.startsWith('POINT')) {
        const match = location.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
        if (match) {
            return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
        }
    } else if (location.coordinates) {
        return { lng: location.coordinates[0], lat: location.coordinates[1] };
    } else if (location.x !== undefined && location.y !== undefined) {
        return { lng: location.x, lat: location.y };
    }

    return { lat: 0, lng: 0 };
}

export async function GET(request: NextRequest) {
    // 檢查限流
    const limiter = getRateLimitService();
    const rateLimitResult = limiter.check(request, DEFAULT_RATE_LIMITS.l1Places);

    if (!rateLimitResult.allowed) {
        return limiter.createTooManyRequestsResponse(rateLimitResult);
    }

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

        // 解析站點 ID 列表
        const stationIds = stationId.includes(',')
            ? stationId.split(',')
            : [stationId];

        // =========================================
        // 查詢自定義景點 (l1_custom_places)
        // =========================================
        let customQuery = supabase
            .from('l1_custom_places')
            .select('*')
            .eq('is_active', true)
            .eq('status', 'approved')
            .in('station_id', stationIds);

        // 分類過濾
        if (category) {
            customQuery = customQuery.eq('category', category);
        }

        // 只顯示合作店家
        if (includePartnerOnly) {
            customQuery = customQuery.eq('is_partner', true);
        }

        const { data: customData, error: customError } = await customQuery;

        if (customError) {
            console.error('[API/l1/places] Custom places error:', customError);
            return NextResponse.json(
                { error: customError.message },
                { status: 500 }
            );
        }

        // =========================================
        // 查詢 OSM 景點 (l1_places)
        // =========================================
        let osmQuery = supabase
            .from('l1_places')
            .select('*')
            .in('station_id', stationIds);

        // 分類過濾（對 OSM 景點也生效）
        if (category) {
            osmQuery = osmQuery.eq('category', category);
        }

        const { data: osmData, error: osmError } = await osmQuery;

        if (osmError) {
            console.error('[API/l1/places] OSM places error:', osmError);
            return NextResponse.json(
                { error: osmError.message },
                { status: 500 }
            );
        }

        // =========================================
        // 格式化並合併結果
        // =========================================
        const customPlaces = (customData || []).map(row => {
            const loc = parsePointLocation(row.location);
            return {
                id: row.id,
                source: 'custom',
                name: row.name_i18n?.zh || row.name_i18n?.ja || row.name_i18n?.en || row.name || '',
                name_i18n: row.name_i18n,
                category: row.category,
                subcategory: row.subcategory,
                location: { lat: loc.lat, lng: loc.lng },
                isPartner: row.is_partner || false,
                affiliateUrl: row.affiliate_url,
                discountInfo: row.discount_info,
                businessHours: row.business_hours,
                logoUrl: row.logo_url,
                priority: row.priority || 100,
                osm_id: 0
            };
        });

        const osmPlaces = (osmData || []).map(row => {
            const loc = parsePointLocation(row.location);
            return {
                id: row.id,
                source: 'osm',
                name: row.name_i18n?.zh || row.name_i18n?.en || row.name_i18n?.ja || row.name || '',
                name_i18n: row.name_i18n,
                category: row.category,
                subcategory: row.subcategory,
                location: { lat: loc.lat, lng: loc.lng },
                isPartner: false,
                affiliateUrl: null,
                discountInfo: null,
                businessHours: null,
                logoUrl: null,
                priority: 50, // OSM 景點預設較低優先級
                osm_id: row.osm_id
            };
        });

        // 合併結果：自定義景點優先
        let allPlaces = [...customPlaces, ...osmPlaces];

        // 按優先級排序（合作店家 > 自定義 > OSM）
        allPlaces = allPlaces.sort((a, b) => {
            if (a.isPartner !== b.isPartner) return a.isPartner ? -1 : 1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return 0;
        });

        const response = NextResponse.json({
            places: allPlaces,
            summary: {
                total: allPlaces.length,
                custom: customPlaces.length,
                osm: osmPlaces.length,
                partner: customPlaces.filter(p => p.isPartner).length
            }
        });

        // 添加限流響應頭
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetAt / 1000).toString());

        return response;
    } catch (err) {
        console.error('[API/l1/places] Error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
