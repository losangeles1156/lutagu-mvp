import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/security/audit';
import { fetchWeatherAlerts } from '@/lib/weather/service';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'zh';

    try {
        const alerts = await fetchWeatherAlerts(locale);

        return NextResponse.json({
            alerts,
            fetched_at: new Date().toISOString(),
            _attribution: 'Japan Meteorological Agency (JMA)'
        });

    } catch (error: any) {
        // Log Error via Audit (Optional)
        void writeAuditLog(request as any, {
            actorUserId: null,
            action: 'create',
            resourceType: 'weather_alerts',
            resourceId: 'tokyo',
            before: null,
            after: {
                ok: false,
                upstream: 'jma_rss',
                error: String(error?.message || error || '')
            }
        });
        console.error('Weather API Error:', error.message);
        return NextResponse.json({ alerts: [], error: 'Failed to fetch weather data' }, { status: 500 });
    }
}
