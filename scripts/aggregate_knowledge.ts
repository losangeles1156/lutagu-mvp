
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Copied from src/lib/constants/stationLines.ts
const HUB_STATION_MEMBERS: Record<string, string[]> = {
    // Kanda (JR + Metro Ginza)
    'odpt:Station:JR-East.Kanda': [
        'odpt:Station:JR-East.Kanda',
        'odpt:Station:TokyoMetro.Kanda',
        'odpt.Station:TokyoMetro.Ginza.Kanda'
    ],
    'odpt:Station:TokyoMetro.Kanda': [
        'odpt:Station:JR-East.Kanda',
        'odpt:Station:TokyoMetro.Kanda',
        'odpt.Station:TokyoMetro.Ginza.Kanda'
    ],

    // Ueno (JR + Metro Ginza + Metro Hibiya)
    'odpt:Station:JR-East.Ueno': [
        'odpt:Station:JR-East.Ueno',
        'odpt:Station:TokyoMetro.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno',
        'odpt:Station:Keisei.KeiseiUeno'
    ],
    'odpt:Station:TokyoMetro.Ueno': [
        'odpt:Station:JR-East.Ueno',
        'odpt:Station:TokyoMetro.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno',
        'odpt:Station:Keisei.KeiseiUeno'
    ],

    // Akihabara (JR + Metro Hibiya + Tsukuba Express)
    'odpt:Station:JR-East.Akihabara': [
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara',
        'odpt:Station:TokyoMetro.Akihabara'
    ],
    'odpt:Station:TsukubaExpress.Akihabara': [
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara',
        'odpt:Station:TokyoMetro.Akihabara'
    ],
    'odpt:Station:TokyoMetro.Akihabara': [ // Added explicitly
        'odpt:Station:JR-East.Akihabara',
        'odpt:Station:TsukubaExpress.Akihabara',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara',
        'odpt:Station:TokyoMetro.Akihabara'
    ],

    // Tokyo (JR + Metro Marunouchi)
    'odpt:Station:JR-East.Tokyo': [
        'odpt:Station:JR-East.Tokyo',
        'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
        'odpt:Station:TokyoMetro.Tokyo'
    ],

    // Shinjuku (JR + Metro Marunouchi + Toei Shinjuku + Toei Oedo)
    'odpt:Station:JR-East.Shinjuku': [
        'odpt:Station:JR-East.Shinjuku',
        'odpt:Station:TokyoMetro.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
        'odpt.Station:Toei.Shinjuku.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku',
        'odpt:Station:Toei.Shinjuku'
    ],

    // Shibuya Group
    'odpt:Station:JR-East.Shibuya': [
        'odpt:Station:JR-East.Shibuya',
        'odpt:Station:TokyoMetro.Shibuya',
        'odpt.Station:TokyoMetro.Ginza.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya',
        'odpt.Station:TokyoMetro.Fukutoshin.Shibuya'
    ],

    // Ikebukuro Group
    'odpt:Station:JR-East.Ikebukuro': [
        'odpt:Station:JR-East.Ikebukuro',
        'odpt:Station:TokyoMetro.Ikebukuro',
        'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
        'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro',
        'odpt.Station:TokyoMetro.Fukutoshin.Ikebukuro'
    ],

    // Shimbashi
    'odpt:Station:JR-East.Shimbashi': [
        'odpt:Station:JR-East.Shimbashi',
        'odpt:Station:TokyoMetro.Shimbashi',
        'odpt.Station:TokyoMetro.Ginza.Shimbashi',
        'odpt.Station:Toei.Asakusa.Shimbashi',
        'odpt:Station:Yurikamome.Shimbashi',
        'odpt:Station:Toei.Shimbashi'
    ],

    // Asakusa
    'odpt:Station:TokyoMetro.Asakusa': [
        'odpt:Station:TokyoMetro.Asakusa',
        'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:Toei.Asakusa.Asakusa',
        'odpt:Station:Tobu.Skytree.Asakusa',
        'odpt:Station:Toei.Asakusa'
    ]
};

async function aggregateKnowledge() {
    console.log('Starting Knowledge Aggregation...');

    // Get all unique involved IDs
    const allIds = new Set<string>();
    Object.values(HUB_STATION_MEMBERS).forEach(list => list.forEach(id => allIds.add(id)));
    const uniqueIds = Array.from(allIds);

    console.log(`Fetching knowledge for ${uniqueIds.length} nodes...`);

    // Fetch existing knowledge
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, riding_knowledge')
        .in('id', uniqueIds);

    if (error) {
        console.error('Error fetching nodes:', error);
        return;
    }

    const knowledgeMap = new Map<string, any>();
    nodes?.forEach(n => {
        if (n.riding_knowledge) {
            knowledgeMap.set(n.id, n.riding_knowledge);
        }
    });

    // For each Hub Group, merge knowledge
    const updates = new Map<string, any>();

    for (const [hubId, members] of Object.entries(HUB_STATION_MEMBERS)) {
        const merged = { traps: [] as any[], hacks: [] as any[], facilities: [] as any[] };

        // Collect from all members
        for (const memberId of members) {
            const k = knowledgeMap.get(memberId);
            if (k) {
                if (Array.isArray(k.traps)) merged.traps.push(...k.traps);
                if (Array.isArray(k.hacks)) merged.hacks.push(...k.hacks);
                if (Array.isArray(k.facilities)) merged.facilities.push(...k.facilities);
            }
        }

        // Deduplicate
        merged.traps = deduplicate(merged.traps);
        merged.hacks = deduplicate(merged.hacks);
        merged.facilities = deduplicateFacilities(merged.facilities);

        // Assign to all members
        if (merged.traps.length > 0 || merged.hacks.length > 0) {
            for (const memberId of members) {
                updates.set(memberId, merged);
            }
        }
    }

    console.log(`Preparing to update ${updates.size} nodes...`);

    for (const [id, data] of updates.entries()) {
        const { error: updateError } = await supabase
            .from('nodes')
            .update({ riding_knowledge: data })
            .eq('id', id);

        if (updateError) {
            console.error(`Failed to update ${id}:`, updateError);
        } else {
            console.log(`Updated ${id} with ${data.traps.length} traps, ${data.hacks.length} hacks.`);
        }
    }

    console.log('Aggregation Complete.');
}

function deduplicate(items: any[]) {
    const unique = new Map();
    items.forEach(item => {
        // Key by title
        if (!unique.has(item.title)) {
            unique.set(item.title, item);
        }
    });
    return Array.from(unique.values());
}

function deduplicateFacilities(items: any[]) {
    const unique = new Map();
    items.forEach(item => {
        const key = `${item.type}-${item.location}`;
        if (!unique.has(key)) {
            unique.set(key, item);
        }
    });
    return Array.from(unique.values());
}

aggregateKnowledge();
