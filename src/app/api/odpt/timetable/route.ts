import { NextRequest, NextResponse } from 'next/server';
import { odptClient } from '@/lib/odpt/client';
import { getJSTTime } from '@/lib/utils/timeUtils';

export const runtime = 'nodejs';

// Helper: Get JST Time and Day
function getJSTContext() {
    const jst = getJSTTime();
    const currentMinutes = jst.hour * 60 + jst.minute;
    return { currentMinutes, calendarSelector: jst.calendarSelector };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const station = searchParams.get('station');
    const raw = (searchParams.get('raw') || '').toLowerCase();

    if (!station) return NextResponse.json({ error: 'Missing station ID' }, { status: 400 });

    // Normalize station ID to use dot format (standard for ODPT API queries)
    const apiStationId = station.replace(/^odpt[.:]Station:/, 'odpt.Station:');

    const { currentMinutes, calendarSelector } = getJSTContext();

    try {
        // [Architectural Fix] Prefer Static Data (Knowledge Base)
        let tables: any[] = [];
        // Sanitize station ID for file system (assuming ':' might need handling, but based on find results, paths use ':' directly? 
        // macOS supports ':', but checking find results: knowledge/stations/odpt.Station:Toei.Oedo.Tochomae/timetables.json
        // So we use apiStationId directly.

        // Note: In Vercel, need to ensure 'knowledge' dir is included. For now, we assume local or configured for build.
        const fs = await import('fs');
        const path = await import('path');
        const knowledgePath = path.join(process.cwd(), 'knowledge', 'stations', apiStationId, 'timetables.json');

        if (fs.existsSync(knowledgePath)) {
            console.log(`[Timetable API] Using Static Data for ${apiStationId}`);
            try {
                const fileContent = fs.readFileSync(knowledgePath, 'utf-8');
                tables = JSON.parse(fileContent);
            } catch (e) {
                console.error('[Timetable API] Failed to parse static JSON:', e);
            }
        }

        // Fallback to ODPT API if no static data
        if (tables.length === 0) {
            console.log(`[Timetable API] Static data missing, fetching from ODPT for ${apiStationId}`);
            tables = await odptClient.getStationTimetable(apiStationId);
        }

        // Filter by Calendar
        const relevantTables = tables.filter((t: any) => {
            const calRaw = t?.['odpt:calendar'];
            if (typeof calRaw !== 'string') return true;
            const cal = calRaw.replace('odpt.Calendar:', '');
            // [Fix] Map 'Sunday' to 'SaturdayHoliday' if data missing
            // If today is Sunday, and selector has [Sunday], but data only has [SaturdayHoliday], logic:
            // calendarSelector (from timeUtils) includes 'SaturdayHoliday' for Sunday.
            // So if data has 'SaturdayHoliday', 'SaturdayHoliday'.includes('SaturdayHoliday') is true.
            // This logic works. Issue was likely lack of static data being read!
            return calendarSelector.some(c => cal.includes(c));
        });

        if (raw === '1' || raw === 'true') {
            return NextResponse.json(relevantTables.length > 0 ? relevantTables : tables, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
                }
            });
        }

        // Process Departures
        const directions: Record<string, any[]> = {};

        relevantTables.forEach((table: any) => {
            const dir = table['odpt:railDirection']?.replace('odpt.RailDirection:', '') || 'Unknown';
            const trips = table['odpt:stationTimetableObject'] || [];

            // Find next 3 trains
            const upcoming = trips.map((trip: any) => {
                const [h, m] = trip['odpt:departureTime'].split(':').map(Number);
                const tripMinutes = h * 60 + m;
                // Handle late night trains (next day) if needed, but simple logic for now
                // ODPT usually uses 24h+ format (e.g. 25:00) so this comparison holds
                return { ...trip, minutes: tripMinutes };
            })
                .filter((trip: any) => trip.minutes >= currentMinutes)
                .sort((a: any, b: any) => a.minutes - b.minutes)
                .slice(0, 10)
                .map((trip: any) => ({
                    time: trip['odpt:departureTime'],
                    dest: trip['odpt:destinationStation']?.[0]?.split('.').pop() || 'Unknown',
                    trainType: trip['odpt:trainType']?.split(':').pop()
                }));

            if (upcoming.length > 0) {
                if (!directions[dir]) directions[dir] = [];
                directions[dir].push(...upcoming);
            }
        });

        return NextResponse.json({ station, directions }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
            }
        });

    } catch (error) {
        console.error('Timetable API Error:', error);
        return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 });
    }
}
