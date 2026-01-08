
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_API_TOKEN;

const JR_RAILWAYS = [
    'odpt.Railway:JR-East.Yamanote',
    'odpt.Railway:JR-East.ChuoRapid',
    'odpt.Railway:JR-East.ChuoSobuLocal',
    'odpt.Railway:JR-East.KeihinTohokuNegishi',
    'odpt.Railway:JR-East.SaikyoKawagoe',
    'odpt.Railway:JR-East.ShonanShinjuku',
    'odpt.Railway:JR-East.Tokaido',
    'odpt.Railway:JR-East.Yokosuka',
    'odpt.Railway:JR-East.Keiyo',
    'odpt.Railway:JR-East.JobanRapid',
    'odpt.Railway:JR-East.JobanLocal'
];

async function main() {
    console.log('--- Repopulating JR Nodes ---');

    const allStations: any[] = [];

    for (const r of JR_RAILWAYS) {
        const url = `https://api-challenge.odpt.org/api/v4/odpt:Station?odpt:railway=${r}&acl:consumerKey=${ODPT_TOKEN}`;
        console.log(`Fetching stations for ${r}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                allStations.push(...data);
            } else {
                console.error(`Failed ${r}: ${res.status}`);
            }
        } catch (e) { console.error(`Error ${r}`, e); }
    }

    console.log(`Fetched ${allStations.length} JR stations.`);

    // Consolidation by Name
    const groups = new Map<string, any>();

    for (const s of allStations) {
        const nameEn = s['odpt:stationTitle']?.en;
        const lat = s['geo:lat'];
        const lon = s['geo:long'];
        if (!nameEn || !lat || !lon) continue;

        const cleanName = nameEn.replace(/\?/g, '').trim();
        const key = cleanName.toLowerCase();

        if (groups.has(key)) {
            const g = groups.get(key);
            g.railways.add(s['odpt:railway']);
            g.ids.push(s['owl:sameAs']);
        } else {
            groups.set(key, {
                name: s['odpt:stationTitle'],
                cleanName: cleanName,
                lat,
                lon,
                railways: new Set([s['odpt:railway']]),
                ids: [s['owl:sameAs']]
            });
        }
    }

    console.log(`Consolidated into ${groups.size} unique JR stations.`);

    const toInsert = Array.from(groups.values()).map(g => {
        const railways = Array.from(g.railways);
        const id = `odpt.Station:JR-East.${g.cleanName.replace(/[^a-zA-Z0-9]/g, '')}`;

        return {
            id,
            city_id: 'tokyo_core',
            name: g.name,
            coordinates: `POINT(${g.lon} ${g.lat})`,
            node_type: 'station',
            is_active: true,
            transit_lines: railways,
            facility_profile: {
                operator: 'JR',
                odpt_operator: 'odpt.Operator:JR-East',
                merged_ids: g.ids
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
