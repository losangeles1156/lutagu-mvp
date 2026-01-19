import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditMinatoStations() {
    console.log('=== Minato Stations Data Audit ===\n');

    // Target Stations (based on map & user request)
    // Note: Names might differ in ID (e.g. Tsukishima is Chuo ward technically but user grouped them)
    // Station List:
    // 1. Shimbashi (TokyoMetro/JR)
    // 2. Hamamatsucho (JR + Daimon)
    // 3. Roppongi (Metro/Toei)
    // 4. Hiroo (Metro)
    // 5. Tsukishima (Metro/Toei) - Chuo/Koto border
    // 6. Kachidoki (Toei) - Chuo
    // 7. Akasaka-mitsuke (Metro)

    // We need to find their exact IDs from `nodes` table first using fuzzy search or known patterns.
    // Known patterns:
    const searchTerms = ['Shimbashi', 'Hamamatsucho', 'Roppongi', 'Hiroo', 'Tsukishima', 'Kachidoki', 'Akasaka-mitsuke'];

    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name')
        .or(searchTerms.map(t => `id.ilike.%${t}%`).join(','));

    if (error) { console.error(error); return; }

    // Filter relevant nodes (active/primary)
    // We want to avoid listing every alias, just the ones likely used on map.
    const uniqueNodes = nodes?.filter(n =>
        !n.id.includes('Alias') && (n.id.includes('JR-East') || n.id.includes('TokyoMetro') || n.id.includes('Toei'))
    );

    console.log(`Found ${uniqueNodes?.length} matching node IDs.`);

    for (const node of uniqueNodes || []) {
        console.log(`\n🔍 ${node.name} (${node.id})`);

        // L1 Check (Places)
        const { count: l1Count } = await supabase
            .from('l1_places')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', node.id);

        console.log(`   - L1 POIs: ${l1Count}`);

        // L3 Check (Facilities)
        // Check local DB `stations_static`
        const { data: l3Data } = await supabase
            .from('stations_static')
            .select('platform_count, facilities')
            .eq('station_id', node.id)
            .single();

        const hasL3 = !!l3Data;
        console.log(`   - L3 Data: ${hasL3 ? '✅ Present' : '❌ Missing'}`);
        if (hasL3) {
            const facs = l3Data.facilities || {};
            const keys = Object.keys(facs).length;
            console.log(`     (Facilities: ${keys} keys, Platforms: ${l3Data.platform_count})`);
        }

        // L4 Check (Wisdom/Tips) -> Assuming in `nodes` table column `l4_tips` or separate table?
        // Or strictly strictly "wisdom" table?
        // Let's check `nodes` columns first.
        // Actually L4 is often dynamic or from vector store. `export_dify_wisdom.ts` implies external source.
        // But let's check if `vibe` or `description` is set in `nodes`.
    }
}

auditMinatoStations();
