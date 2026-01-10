import { NextRequest, NextResponse } from 'next/server';
import { getTrainStatus } from '@/lib/odpt/service';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const operatorParam = searchParams.get('operator') || undefined;

        const results = await getTrainStatus(operatorParam);

        return NextResponse.json(results, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
