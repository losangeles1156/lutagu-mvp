import { NextRequest, NextResponse } from 'next/server';
import { odptClient } from '@/lib/odpt/client';

export const dynamic = 'force-dynamic'; // No caching for the proxy route itself, client handles caching

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const operator = searchParams.get('odpt:operator');

    // Safety check: Basic validation
    if (!type || !['odpt:Railway', 'odpt:Station', 'odpt:TrainTimetable', 'odpt:StationTimetable', 'odpt:RailwayFare'].includes(type)) {
        return NextResponse.json({ error: 'Invalid or missing "type" parameter' }, { status: 400 });
    }

    try {
        let data;
        switch (type) {
            case 'odpt:Railway':
                data = await odptClient.getRailways(operator || undefined);
                break;
            case 'odpt:Station':
                data = await odptClient.getStations(operator || undefined);
                break;
            case 'odpt:TrainTimetable':
                // For simplicity in proxy, we pass query params mostly as is or restricted
                // We map query params for safety
                const railDirection = searchParams.get('odpt:railDirection');
                const railway = searchParams.get('odpt:railway');
                if (!operator) return NextResponse.json({ error: 'Operator required for Timetable' }, { status: 400 });
                data = await odptClient.getTrainTimetable(operator, railDirection || undefined, railway || undefined);
                break;
            case 'odpt:RailwayFare':
                const from = searchParams.get('odpt:fromStation');
                const to = searchParams.get('odpt:toStation');
                if (!from || !to) return NextResponse.json({ error: 'From/To stations required for Fare' }, { status: 400 });
                data = await odptClient.getFares(from, to, operator || undefined);
                break;
            default:
                // Fallback for generic fetch if needed, but keeping it restricted for now
                return NextResponse.json({ error: 'Type not fully supported in proxy' }, { status: 501 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('ODPT Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
