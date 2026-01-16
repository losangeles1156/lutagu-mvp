import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        // 1. Get today's daily stats
        const today = new Date().toISOString().split('T')[0];

        const { data: dailyStatsData, error: dailyError } = await supabaseAdmin
            .from('view_daily_session_quality')
            .select('*')
            .gte('date', today)
            .single();

        // Fallback to empty stats if no data today
        const dailyStats = dailyStatsData || {
            date: today,
            total_sessions: 0,
            engaged_sessions: 0,
            conversion_sessions: 0,
            positive_feedback_sessions: 0,
            negative_feedback_sessions: 0,
            conversion_rate_pct: 0,
            problem_solution_rate_pct: 0,
        };

        // 2. Get recent sessions (last 20)
        const { data: recentSessions, error: sessionsError } = await supabaseAdmin
            .from('view_session_journey')
            .select('*')
            .order('session_start', { ascending: false })
            .limit(20);

        if (sessionsError) {
            console.error('[Admin Dashboard] Session fetch error:', sessionsError);
        }

        return NextResponse.json({
            dailyStats,
            recentSessions: recentSessions || [],
        });

    } catch (error: any) {
        console.error('[Admin Dashboard] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
