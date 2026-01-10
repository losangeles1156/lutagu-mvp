import { NextRequest, NextResponse } from 'next/server';
import {
    getAPIPerformanceSummary,
    getAIQualitySummary,
    getHourlyVolume,
    getSlowRequests,
    getRecentAIErrors
} from '@/lib/monitoring/performanceLogger';

export const runtime = 'nodejs';

/**
 * GET: Retrieve performance metrics for admin dashboard
 */
export async function GET(req: NextRequest) {
    try {
        // Fetch all metrics in parallel
        const [apiPerformance, aiQuality, hourlyVolume, slowRequests, aiErrors] = await Promise.all([
            getAPIPerformanceSummary(),
            getAIQualitySummary(),
            getHourlyVolume(),
            getSlowRequests(10),
            getRecentAIErrors(10)
        ]);

        return NextResponse.json({
            apiPerformance,
            aiQuality,
            hourlyVolume,
            slowRequests,
            aiErrors,
            generatedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Admin Metrics API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
