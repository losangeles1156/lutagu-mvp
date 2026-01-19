import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTopStations() {
    console.log('=== Top 5 Stations Category Breakdown ===\n');

    // 1. Find Top 5 Stations
    // (Since we can't do complex GROUP BY/ORDER BY count easily in one Supabase call without rpc,
    // we fetch counts first or use the logic from monitor script)

    // We'll fetch all items first (it's ~33k, manageable for node script) or use a smarter query if possible.
    // Let's use the monitor script logic: fetch all station_ids

    let allStationIds: string[] = [];
    let from = 0;
    const pageSize = 5000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('l1_places')
            .select('station_id')
            .range(from, from + pageSize - 1);

        if (error) { console.error(error); return; }
        if (!data || data.length === 0) break;

        allStationIds = allStationIds.concat(data.map((p: any) => p.station_id));
        if (data.length < pageSize) hasMore = false;
        from += pageSize;
    }

    const counts: Record<string, number> = {};
    allStationIds.forEach(id => counts[id] = (counts[id] || 0) + 1);

    const top5 = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    console.log('Top 5 Stations by Total Count:');
    top5.forEach(([id, count]) => console.log(`- ${id}: ${count}`));
    console.log('\n--- Category Breakdown ---');

    for (const [stationId] of top5) {
        const { data, error } = await supabase
            .from('l1_places')
            .select('category, subcategory, name')
            .eq('station_id', stationId);

        if (error) continue;

        const catCounts: Record<string, number> = {};
        const subExamples: Record<string, string[]> = {};

        data?.forEach((row: any) => {
            const cat = row.category || 'unknown';
            catCounts[cat] = (catCounts[cat] || 0) + 1;

            if (!subExamples[cat]) subExamples[cat] = [];
            if (subExamples[cat].length < 3) subExamples[cat].push(`${row.subcategory} (${row.name})`);
        });

        console.log(`\n📌 ${stationId} (Total: ${data?.length})`);
        console.table(catCounts);
        // Check if any category exceeds quotas significantly
        // Expected: dining/shopping ~50, others ~30
    }
}

analyzeTopStations();
