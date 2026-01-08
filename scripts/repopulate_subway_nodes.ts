
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_API_TOKEN;

const OPERATORS = [
    'odpt.Operator:TokyoMetro',
    'odpt.Operator:Toei'
];

async function main() {
    console.log('--- Repopulating Subway Nodes (Metro & Toei) ---');

    const allStations: any[] = [];

    for (const op of OPERATORS) {
        const url = `https://api-challenge.odpt.org/api/v4/odpt:Station?odpt:operator=${op}&acl:consumerKey=${ODPT_TOKEN}`;
        console.log(`Fetching stations for ${op}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                allStations.push(...data);
            } else {
                console.error(`Failed ${op}: ${res.status}`);
            }
        } catch (e) { console.error(`Error ${op}`, e); }
    }

    console.log(`Fetched ${allStations.length} Subway stations.`);

    // Consolidation by Name (ignoring operator for now to avoid duplicates, but user might want them separate if they are distinct stations)
    // Actually, subway stations are usually unique per operator.
    const groups = new Map<string, any>();

    for (const s of allStations) {
        const title = s['odpt:stationTitle'] || {};
        const nameEn = title.en || s['dc:title'] || s['owl:sameAs'].split('.').pop();
        const lat = s['geo:lat'];
        const lon = s['geo:long'];
        const operator = s['odpt:operator'].split(':').pop();
        if (!lat || !lon) {
            console.log(`Skipping ${s['owl:sameAs']} (no coords)`);
            continue;
        }

        const cleanName = (typeof nameEn === 'string' ? nameEn : (nameEn as any).en || '').replace(/\?/g, '').trim();
        const id = s['owl:sameAs'];

        groups.set(id, {
            id,
            name: title.en ? title : { en: cleanName, ja: s['dc:title'] },
            cleanName: cleanName,
            lat,
            lon,
            railways: [s['odpt:railway']],
            operator
        });
    }

    console.log(`Consolidated into ${groups.size} unique Subway station IDs.`);

    const toInsert = Array.from(groups.values()).map(g => {
        return {
            id: g.id,
            city_id: 'tokyo_core',
            name: g.name,
            coordinates: `POINT(${g.lon} ${g.lat})`,
            node_type: 'station',
            is_active: true, // Will filter by ward later
            transit_lines: g.railways,
            facility_profile: {
                operator: g.operator,
                odpt_operator: `odpt.Operator:${g.operator}`
            }
        };
    });

    console.log(`Upserting ${toInsert.length} nodes to Supabase...`);
    const { error } = await supabase.from('nodes').upsert(toInsert, { onConflict: 'id' });

    if (error) {
        console.error('Error upserting:', error);
    } else {
        console.log('✅ Success!');
    }
}

main();
