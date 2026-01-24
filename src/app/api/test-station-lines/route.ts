import { NextResponse } from 'next/server';
import { STATION_LINES } from '@/lib/constants/stationLines';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('id') || 'odpt.Station:TokyoMetro.Ginza.Asakusa';

    const directMatch = STATION_LINES[stationId];
    const swappedId = stationId.startsWith('odpt.Station:')
        ? stationId.replace(/^odpt\.Station:/, 'odpt:Station:')
        : stationId.replace(/^odpt:Station:/, 'odpt.Station:');
    const swappedMatch = STATION_LINES[swappedId];

    const allKeys = Object.keys(STATION_LINES).filter(k => k.includes('Asakusa'));

    return NextResponse.json({
        test_id: stationId,
        direct_match: directMatch ? `Found ${Array.isArray(directMatch) ? directMatch.length : 1} lines` : 'NOT FOUND',
        swapped_id: swappedId,
        swapped_match: swappedMatch ? `Found ${Array.isArray(swappedMatch) ? swappedMatch.length : 1} lines` : 'NOT FOUND',
        all_asakusa_keys: allKeys
    });
}
