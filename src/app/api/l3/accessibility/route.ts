import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * L3 無障礙設施 API
 * 
 * 查詢類型:
 * - ?station_id=xxx : 取得特定車站的無障礙設施
 * - ?type=elevator|escalator|toilet : 篩選設施類型
 * - ?ward=xxx : 依行政區篩選
 * 
 * 回傳格式:
 * {
 *   station_id: string,
 *   type: 'elevator' | 'escalator' | 'toilet',
 *   name_i18n: { 'zh-TW': string, 'ja': string, 'en': string },
 *   attributes: { location: string, floors?: string, accessible?: boolean, ... },
 *   station_info: { name: { 'zh-TW': string, 'ja': string, 'en': string }, ward: string }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const type = searchParams.get('type');
    const ward = searchParams.get('ward');
    const locale = searchParams.get('locale') || 'zh-TW';

    // 構建查詢
    let query = supabase
      .from('l3_facilities')
      .select(`
        station_id,
        type,
        name_i18n,
        attributes
      `);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: facilities, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch accessibility facilities', details: error },
        { status: 500 }
      );
    }

    // 如果沒有指定 station_id，則需要關聯車站資訊
    if (!stationId && facilities && facilities.length > 0) {
      const stationIds = [...new Set(facilities.map(f => f.station_id))];

      const { data: stations } = await supabase
        .from('nodes')
        .select('id, name, address')
        .in('id', stationIds);

      // 建立 station_id 到車站資訊的映射
      const stationMap = new Map();
      stations?.forEach(s => {
        stationMap.set(s.id, {
          name: s.name,
          ward: s.address?.['zh-TW']?.includes('區')
            ? s.address['zh-TW'].split('區')[0] + '區'
            : null
        });
      });

      // 格式化回應
      const response = facilities.map(f => ({
        ...f,
        station_info: stationMap.get(f.station_id) || null
      }));

      return NextResponse.json({
        success: true,
        count: facilities.length,
        data: response
      });
    }

    return NextResponse.json({
      success: true,
      count: facilities?.length || 0,
      data: facilities || []
    });

  } catch (error) {
    console.error('L3 Accessibility API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
