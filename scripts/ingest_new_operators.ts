
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TOKENS = {
    CHALLENGE: process.env.ODPT_CHALLENGE_TOKEN || process.env.ODPT_API_TOKEN_BACKUP || '',
    STANDARD: process.env.ODPT_STANDARD_TOKEN || process.env.ODPT_API_TOKEN || ''
};

const OPERATORS = [
    { id: 'odpt.Operator:Tobu', token: TOKENS.CHALLENGE, endpoint: 'https://api-challenge.odpt.org/api/v4' },
    { id: 'odpt.Operator:Keikyu', token: TOKENS.CHALLENGE, endpoint: 'https://api-challenge.odpt.org/api/v4' },
    { id: 'odpt.Operator:Tokyu', token: TOKENS.CHALLENGE, endpoint: 'https://api-challenge.odpt.org/api/v4' },
    { id: 'odpt.Operator:TWR', token: TOKENS.STANDARD, endpoint: 'https://api.odpt.org/api/v4' }
];

async function fetchOdpt(endpoint: string, type: string, operator: string, token: string, extraParams: Record<string, string> = {}) {
    const params = new URLSearchParams({
        'odpt:operator': operator,
        'acl:consumerKey': token,
        ...extraParams
    });
    const url = `${endpoint}/${type}?${params.toString()}`;
    // console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
    } catch (e: any) {
        console.error(`[Fetch Error] ${operator} ${type}: ${e.message}`);
        return [];
    }
}

function mapStation(s: any) {
    const titles = s['odpt:stationTitle'] || {};
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
        node_type: 'station',
        city_id: 'tokyo_core',
        is_active: true,
        is_hub: false,
        transit_lines: Array.isArray(s['odpt:railway']) ? s['odpt:railway'] : [s['odpt:railway']],
        commercial_rules: {
            operator: s['odpt:operator'],
            station_code: s['odpt:stationCode']
        }
    };
}

function mapFare(f: any) {
    return {
        operator: f['odpt:operator'],
        from_station_id: f['odpt:fromStation'],
        to_station_id: f['odpt:toStation'],
        ticket_fare: f['odpt:ticketFare'],
        ic_card_fare: f['odpt:icCardFare'],
        child_ticket_fare: f['odpt:childTicketFare'],
        child_ic_card_fare: f['odpt:childIcCardFare'],
        updated_at: new Date().toISOString()
    };
}

function mapRailway(r: any) {
    const titles = r['odpt:railwayTitle'] || {};
    return {
        id: r['owl:sameAs'],
        operator_id: r['odpt:operator'],
        name: {
            ja: titles.ja || r['dc:title'] || '',
            en: titles.en || ''
        },
        color: r['odpt:color'],
        line_code: r['odpt:lineCode'],
        station_order: r['odpt:stationOrder'] || [],
        updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🚀 Starting Deep ODPT Ingestion for New Operators...');

    for (const op of OPERATORS) {
        console.log(`\n--- Operator: ${op.id} ---`);

        // 1. Ingest Stations
        const stations = await fetchOdpt(op.endpoint, 'odpt:Station', op.id, op.token);
        console.log(`Received ${stations.length} stations.`);

        if (stations.length > 0) {
            const mappedStations = stations.map(mapStation).filter(s => s.coordinates.coordinates[0] && s.coordinates.coordinates[1]);
            const { error: nodeError } = await supabase
                .from('nodes')
                .upsert(mappedStations, { onConflict: 'id' });

            if (nodeError) console.error(`❌ Station Upsert Error: ${nodeError.message}`);
            else console.log(`✅ Successfully upserted ${mappedStations.length} stations.`);
        }

        // 2. Deep Ingest Fares (Iteration by Station to bypass limit)
        console.log(`Fetching Fares for ${op.id} (Iterative mode)...`);
        let totalFares = 0;
        const CONCURRENCY = 3;
        const stationIds = stations.slice(0, 500).map((s: any) => s['owl:sameAs']); // Limit to reasonable subset if needed, but here we want complete

        for (let i = 0; i < stationIds.length; i += CONCURRENCY) {
            const chunk = stationIds.slice(i, i + CONCURRENCY);
            const promises = chunk.map(async (sid) => {
                const fares = await fetchOdpt(op.endpoint, 'odpt:RailwayFare', op.id, op.token, { 'odpt:fromStation': sid });
                if (fares.length > 0) {
                    const mappedFares = fares.map(mapFare);
                    const { error } = await supabase
                        .from('fares')
                        .upsert(mappedFares, { onConflict: 'operator,from_station_id,to_station_id' });
                    if (error) console.error(`   ❌ Fare Error for ${sid}: ${error.message}`);
                    else totalFares += fares.length;
                }
            });
            await Promise.all(promises);
            process.stdout.write(`\r   Progress: ${Math.min(i + CONCURRENCY, stationIds.length)}/${stationIds.length} stations... Total fares: ${totalFares}`);
            await new Promise(r => setTimeout(r, 100)); // Rate limiting
        }
        console.log(`\n✅ Deep Fare Ingestion success for ${op.id}. Total: ${totalFares}`);

        // 3. Ingest Railways
        const railways = await fetchOdpt(op.endpoint, 'odpt:Railway', op.id, op.token);
        console.log(`Received ${railways.length} railways.`);

        if (railways.length > 0) {
            const mappedRailways = railways.map(mapRailway);
            const { error: railError } = await supabase
                .from('railways')
                .upsert(mappedRailways, { onConflict: 'id' });

            if (railError) console.error(`❌ Railway Upsert Error: ${railError.message}`);
            else console.log(`✅ Successfully upserted ${mappedRailways.length} railways.`);
        }
    }


    console.log('\n🌟 Ingestion Process Complete.');
}

main().catch(console.error);
