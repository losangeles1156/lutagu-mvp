import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherAlerts } from '@/lib/weather/service';
import { getTrainStatus } from '@/lib/odpt/service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get('locale') || 'zh';

    try {
        // Parallel execution for lowest latency
        const [weatherAlerts, trainStatusRaw] = await Promise.all([
            fetchWeatherAlerts(locale),
            getTrainStatus()
        ]);

        // Filter Train Status (Same logic as train-status/route.ts)
        const trainStatus = trainStatusRaw.map((item: any) => ({
            railway: item['odpt:railway']?.split(':').pop(),
            status: item['odpt:trainInformationText']?.[locale] ||
                item['odpt:trainInformationText']?.en ||
                item['odpt:trainInformationText']?.ja,
            operator: item['odpt:operator']?.split(':').pop(),
            time: item['dc:date']
        }));

        // Construct Snapshot response
        const snapshot = {
            timestamp: new Date().toISOString(),
            weather: {
                alerts: weatherAlerts,
                source: 'JMA'
            },
            transit: {
                trains: trainStatus,
                source: 'ODPT'
            },
            _meta: {
                locale,
                attribution: 'Data provided by Japan Meteorological Agency (JMA) and Open Data Platform for Public Transportation (ODPT).'
            }
        };

        return NextResponse.json(snapshot, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });

    } catch (error: any) {
        console.error('Snapshot API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
