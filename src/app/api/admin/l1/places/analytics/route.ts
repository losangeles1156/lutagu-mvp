import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Mark as dynamic to prevent static generation error
// "Route couldn't be rendered statically because it used `request.url`"
export const dynamic = 'force-dynamic';

// GET /api/admin/l1/places/analytics - Get analytics data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const supabase = getSupabaseAdmin();

        // Get date range from query params
        const period = searchParams.get('period') || '30'; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Place statistics
        const { count: totalPlaces } = await supabase
            .from('l1_custom_places')
            .select('*', { count: 'exact', head: true });

        const { count: activePlaces } = await supabase
            .from('l1_custom_places')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { count: partnerPlaces } = await supabase
            .from('l1_custom_places')
            .select('*', { count: 'exact', head: true })
            .eq('is_partner', true)
            .eq('is_active', true);

        // Places by category
        const { data: categoryData } = await supabase
            .from('l1_custom_places')
            .select('category')
            .eq('is_active', true);

        const categoryCounts: Record<string, number> = {};
        (categoryData || []).forEach((place: any) => {
            categoryCounts[place.category] = (categoryCounts[place.category] || 0) + 1;
        });

        // Places by status
        const { data: statusData } = await supabase
            .from('l1_custom_places')
            .select('status');

        const statusCounts: Record<string, number> = {
            draft: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
        };
        (statusData || []).forEach((place: any) => {
            statusCounts[place.status] = (statusCounts[place.status] || 0) + 1;
        });

        // Recent places (last 10)
        const { data: recentPlaces } = await supabase
            .from('l1_custom_places')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        // Top stations by place count
        const { data: stationData } = await supabase
            .from('l1_custom_places')
            .select('station_id')
            .eq('is_active', true);

        const stationCounts: Record<string, number> = {};
        (stationData || []).forEach((place: any) => {
            stationCounts[place.station_id] = (stationCounts[place.station_id] || 0) + 1;
        });

        const topStations = Object.entries(stationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([station_id, count]) => ({ station_id, count }));

        // Partner statistics
        const { count: totalPartners } = await supabase
            .from('l1_partners')
            .select('*', { count: 'exact', head: true });

        const { count: activePartners } = await supabase
            .from('l1_partners')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Calculate growth trends (mock data for now)
        const today = new Date().toISOString().split('T')[0];
        const growthData = {
            places_growth: Math.floor(Math.random() * 20) - 5, // -5% to +15%
            partners_growth: Math.floor(Math.random() * 10),
            views_growth: Math.floor(Math.random() * 30),
        };

        return NextResponse.json({
            summary: {
                total_places: totalPlaces || 0,
                active_places: activePlaces || 0,
                partner_places: partnerPlaces || 0,
                total_partners: totalPartners || 0,
                active_partners: activePartners || 0,
            },
            category_distribution: categoryCounts,
            status_distribution: statusCounts,
            top_stations: topStations,
            recent_places: recentPlaces || [],
            growth_trends: growthData,
            period_days: parseInt(period),
            generated_at: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[API] Error fetching analytics:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
