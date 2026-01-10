import { NextRequest, NextResponse } from 'next/server';
import { getTrainStatus } from '@/lib/odpt/service';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const operatorParam = searchParams.get('operator') || undefined;

        const results = await getTrainStatus(operatorParam);

        // Filter for Agent consumption
        const filteredResults = results.map((item: any) => ({
            railway: item['odpt:railway']?.split(':').pop(),
            status: item['odpt:trainInformationText']?.zh || item['odpt:trainInformationText']?.en || item['odpt:trainInformationText']?.ja,
            operator: item['odpt:operator']?.split(':').pop(),
            time: item['dc:date']
        }));

        return NextResponse.json(filteredResults, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
