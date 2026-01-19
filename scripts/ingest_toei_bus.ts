import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ODPT_TOKEN = process.env.ODPT_API_TOKEN_STANDARD || process.env.ODPT_API_TOKEN!;
const ODPT_ENDPOINT = 'https://api-public.odpt.org/api/v4'; // Toei uses public API

async function fetchOdpt(type: string, params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams(params);
    if (ODPT_TOKEN && !params['odpt:operator']?.includes('Toei')) {
        searchParams.append('acl:consumerKey', ODPT_TOKEN);
    }
    const url = `${ODPT_ENDPOINT}/${type}?${searchParams.toString()}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error(`[Fetch Error] ${type}: ${url} - ${e.message}`);
        return [];
    }
}

function mapBusStop(s: any) {
    const titles = s['odpt:busstopPoleTitle'] || {};
    return {
        id: s['owl:sameAs'],
        name: {
            ja: titles.ja || s['dc:title'] || '',
            en: titles.en || '',
            'zh-TW': titles.zh_Hant || titles.ja || '',
            'zh-CN': titles.zh_Hans || titles.ja || ''
        },
        coordinates: {
            type: 'Point',
            coordinates: [s['geo:long'], s['geo:lat']]
        },
        node_type: 'bus_stop',
        city_id: 'tokyo_core',
        is_active: true,
        is_hub: false,
        transit_lines: s['odpt:busroutePattern'] || [],
        commercial_rules: {
            operator: s['odpt:operator'],
            busstop_code: s['odpt:busstopPoleNumber']
        }
    };
}

function mapBusRoute(r: any) {
    const titles = r['odpt:busroutePatternTitle'] || {};
    return {
        id: r['owl:sameAs'],
        operator_id: r['odpt:operator'],
        name: {
            ja: titles.ja || r['dc:title'] || '',
            en: titles.en || ''
        },
        line_code: r['odpt:busroutePatternNumber'],
        station_order: (r['odpt:busstopOrder'] || []).map((o: any) => ({
            station_id: o['odpt:busstopPole'],
            index: o['odpt:index']
        })),
        updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🚌 Starting Toei Bus Static Ingestion...');

    // 1. Ingest Bus Stops (BusstopPole)
    // Note: Toei Bus has > 1000 stops, so we might need pagination if API supports it,
    // but ODPT odpt:BusstopPole often requires specific operator filter.
    console.log('Fetching Toei Bus stops...');
    const busStops = await fetchOdpt('odpt:BusstopPole', { 'odpt:operator': 'odpt.Operator:Toei' });
    console.log(`Received ${busStops.length} bus stops.`);

    if (busStops.length > 0) {
        const mappedStops = busStops.map(mapBusStop).filter(s => s.coordinates.coordinates[0] && s.coordinates.coordinates[1]);
        const CHUNK_SIZE = 500;
        for (let i = 0; i < mappedStops.length; i += CHUNK_SIZE) {
            const chunk = mappedStops.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('nodes').upsert(chunk, { onConflict: 'id' });
            if (error) console.error(`❌ Bus Stop Error (chunk ${i}): ${error.message}`);
            else process.stdout.write(`\r   Progress: ${Math.min(i + CHUNK_SIZE, mappedStops.length)}/${mappedStops.length} stops...`);
        }
        console.log('\n✅ Successfully upserted Toei Bus stops.');
    }

    // 2. Ingest Bus Route Patterns (BusroutePattern)
    console.log('Fetching Toei Bus routes...');
    const busRoutes = await fetchOdpt('odpt:BusroutePattern', { 'odpt:operator': 'odpt.Operator:Toei' });
    console.log(`Received ${busRoutes.length} bus routes.`);

    if (busRoutes.length > 0) {
        const mappedRoutes = busRoutes.map(mapBusRoute);
        const { error } = await supabase.from('railways').upsert(mappedRoutes, { onConflict: 'id' });
        if (error) console.error(`❌ Bus Route Error: ${error.message}`);
        else console.log(`✅ Successfully upserted ${mappedRoutes.length} bus routes.`);
    }

    // 3. Ingest Bus Fares (BusroutePatternFare)
    console.log('Fetching Toei Bus fares...');
    const busFares = await fetchOdpt('odpt:BusroutePatternFare', { 'odpt:operator': 'odpt.Operator:Toei' });
    console.log(`Received ${busFares.length} bus fares.`);

    if (busFares.length > 0) {
        const mappedFares = busFares.map((f: any) => ({
            operator: f['odpt:operator'],
            route_id: f['odpt:busroutePattern'],
            ticket_fare: f['odpt:ticketFare'],
            ic_card_fare: f['odpt:icCardFare'],
            child_ticket_fare: f['odpt:childTicketFare'],
            child_ic_card_fare: f['odpt:childIcCardFare'],
            updated_at: new Date().toISOString()
        }));

        // We will store these in a specialized bus_fares table.
        console.log('Ingesting into bus_fares table...');
        const { error } = await supabase.from('bus_fares').upsert(mappedFares, { onConflict: 'route_id' });
        if (error) console.error(`❌ Bus Fare Error: ${error.message}`);
        else console.log(`✅ Successfully upserted ${mappedFares.length} bus fares.`);
    }

    console.log('🌟 Toei Bus Ingestion Complete.');
}

main().catch(console.error);
