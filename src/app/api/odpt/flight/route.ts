import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

const API_TOKEN = process.env.ODPT_API_TOKEN;
const BASE_URL = 'https://api-challenge.odpt.org/api/v4';

// Cache: Key = "HND-departure" etc.
// TTL: 60 seconds (ODPT data doesn't update that fast)
const cache = new LRUCache<string, any>({
    max: 10,
    ttl: 1000 * 60,
});

// Helper to format time "HH:MM"
function formatTime(isoString: string | undefined): string {
    if (!isoString) return '--:--';
    // Handle "HH:MM" format directly
    if (isoString.match(/^\d{2}:\d{2}$/)) return isoString;
    // Handle ISO string
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return '--:--';
    }
}

// Helper to clean station/airport names
function cleanName(id: string): string {
    return id.split(':').pop()?.split('.').pop() || id;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const airport = searchParams.get('airport'); // 'HND' or 'NRT'
    const type = searchParams.get('type'); // 'departure' or 'arrival'

    if (!API_TOKEN) {
        return NextResponse.json({ error: 'Server misconfiguration: Missing API Token' }, { status: 500 });
    }

    if (!airport || (airport !== 'HND' && airport !== 'NRT')) {
        return NextResponse.json({ error: 'Invalid airport code. Use HND or NRT.' }, { status: 400 });
    }

    if (!type || (type !== 'departure' && type !== 'arrival')) {
        return NextResponse.json({ error: 'Invalid type. Use departure or arrival.' }, { status: 400 });
    }

    const cacheKey = `${airport}-${type}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return NextResponse.json({
            ...cachedData,
            cached: true,
            updated: new Date().toISOString() // Client sees current time, but data is cached
        });
    }

    let url = '';
    const operator = airport === 'HND' ? 'odpt.Operator:HND-TIAT' : 'odpt.Operator:NAA';

    if (type === 'departure') {
        url = `${BASE_URL}/odpt:FlightInformationDeparture?odpt:operator=${operator}&acl:consumerKey=${API_TOKEN}`;
    } else {
        url = `${BASE_URL}/odpt:FlightInformationArrival?odpt:operator=${operator}&acl:consumerKey=${API_TOKEN}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`ODPT Flight API Error: ${res.status} ${res.statusText}`);
            return NextResponse.json({ error: 'External API Error', details: res.statusText }, { status: res.status });
        }

        const data = await res.json();
        const now = new Date();
        // Look back 1 hour and forward 12 hours for relevant flights
        // Note: ODPT data might already be realtime/today only, but good to sort.

        const flights = (Array.isArray(data) ? data : [])
            .map((item: any) => {
                // Common fields
                const airline = cleanName(item['odpt:airline'] || 'Unknown');
                const flightNumbers = Array.isArray(item['odpt:flightNumber'])
                    ? item['odpt:flightNumber'].join(', ')
                    : item['odpt:flightNumber'] || '';

                const statusRaw = item['odpt:flightStatus'] || '';
                const status = cleanName(statusRaw);

                const terminalRaw = type === 'departure'
                    ? item['odpt:departureAirportTerminal']
                    : item['odpt:arrivalAirportTerminal'];
                const terminal = cleanName(terminalRaw || '').replace('Terminal', 'T');

                const gate = type === 'departure'
                    ? item['odpt:departureGate']
                    : item['odpt:arrivalGate'];

                // Time logic
                const scheduled = type === 'departure'
                    ? item['odpt:scheduledDepartureTime']
                    : item['odpt:scheduledArrivalTime'];

                const estimated = type === 'departure'
                    ? item['odpt:estimatedDepartureTime']
                    : item['odpt:estimatedArrivalTime'];

                const actual = type === 'departure'
                    ? item['odpt:actualDepartureTime']
                    : item['odpt:actualArrivalTime'];

                const targetTime = actual || estimated || scheduled;

                // Destination/Origin
                const locationRaw = type === 'departure'
                    ? item['odpt:destinationAirport']
                    : item['odpt:originAirport'];
                const location = cleanName(locationRaw || 'Unknown');

                return {
                    id: item['@id'],
                    time: formatTime(targetTime),
                    scheduledTime: formatTime(scheduled),
                    flightNumber: flightNumbers,
                    airline,
                    location, // Dest for Dep, Origin for Arr
                    status,
                    gate: gate || '-',
                    terminal: terminal || '-'
                };
            })
            .sort((a, b) => a.time.localeCompare(b.time));

        const responseData = {
            airport,
            type,
            flights,
            updated: new Date().toISOString()
        };

        cache.set(cacheKey, responseData);

        return NextResponse.json({
            ...responseData,
            cached: false
        });

    } catch (error) {
        console.error('Flight API Handler Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
