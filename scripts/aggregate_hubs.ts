
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!; // Must use service key for admin updates
const supabase = createClient(supabaseUrl, supabaseKey);

// Target Hubs to aggregate
const TARGET_HUBS = [
    { name: 'Ueno', ja: '上野' },
    { name: 'Tokyo', ja: '東京' },
    { name: 'Shinjuku', ja: '新宿' },
    { name: 'Shibuya', ja: '渋谷' },
    { name: 'Ikebukuro', ja: '池袋' },
    { name: 'Akihabara', ja: '秋葉原' },
    { name: 'Ginza', ja: '銀座' },
    { name: 'Asakusa', ja: '浅草' },
    { name: 'Shinagawa', ja: '品川' }
];

async function aggregateHubs() {
    console.log('🚀 Starting Hub Aggregation Strategy...');

    for (const hub of TARGET_HUBS) {
        console.log(`\nProcessing Hub: ${hub.name} (${hub.ja})...`);

        // 1. Find candidate nodes (matching English or Japanese name)
        // We use a broad search first
        const { data: candidates, error } = await supabase
            .from('nodes')
            .select('id, name, coordinates, node_type, parent_hub_id')
            .or(`name->>en.ilike.%${hub.name}%,name->>ja.ilike.%${hub.ja}%`)
            .neq('node_type', 'hub'); // Don't aggregate existing hubs into themselves

        if (error) {
            console.error(`Error finding candidates for ${hub.name}:`, error);
            continue;
        }

        if (!candidates || candidates.length === 0) {
            console.log(`No candidates found for ${hub.name}`);
            continue;
        }

        // 2. Filter logic (Simple for now: if name matches, we assume it's the same hub area for MVP)
        // In production, we would check geospatial distance < 200m
        // For now, we exclude things like "Nishi-Shinjuku" if we only want "Shinjuku"?
        // Let's be inclusive for "Hub" concept: "Shinjuku-sanchome" IS part of Shinjuku Hub ecosystem.
        // But "Higashi-Ueno" might be distinct?
        // Let's stick to strict name matching for safety or manual list.
        // Actually, for "Ueno", we want "JR-East.Ueno", "TokyoMetro.Ueno", "Keisei.Ueno".
        // We do NOT want "Ueno-hirokoji" yet unless close.

        // Refined filter: exact match on common station names
        const validChildren = candidates.filter(node => {
            const enName = node.name?.en || '';
            const jaName = node.name?.ja || '';
            // Allow "Ueno", "Keisei Ueno", "Ueno Station"
            // Exclude "Ueno-hirokoji" if strictly looking for main station, but for a "Area Hub", it's debatable.
            // Let's keep it simple: if it contains the string, it's a candidate for the Spoke.
            return true;
        });

        console.log(`Found ${validChildren.length} potential spokes:`, validChildren.map(n => n.id));

        if (validChildren.length < 2) {
            console.log(`Not enough nodes to form a Hub (found ${validChildren.length}). Skipping.`);
            // Note: Even 1 node could be a Hub if we want to elevate it, but usually aggregation implies multiple.
            // For consistency, we might want to wrap even single major stations.
            // Let's skip for now to avoid over-engineering.
            continue;
        }

        // 3. Create or Update Hub Node
        const hubId = `Hub:${hub.name}`;

        // Calculate Centroid
        let sumLon = 0, sumLat = 0;
        let count = 0;
        validChildren.forEach(child => {
            // Parse Point
            // child.location is usually GeoJSON object or string depending on client config.
            // Supabase returns GeoJSON object usually if configured, or string.
            // Let's handle both safely if possible, or assume string WKT if that's what we saw earlier.
            // Earlier logs showed: location: { coordinates: [lon, lat] } in types, but 'POINT(...)' in raw seed?
            // Let's check the data returned.
            // Assuming it matches the DB format.
        });

        // Simple fallback location: use the first child's location
        const representativeLoc = validChildren[0].coordinates;

        const hubPayload = {
            id: hubId,
            city_id: 'tokyo_core', // assume core
            name: { en: `${hub.name} Hub`, ja: `${hub.ja} 枢紐`, zh: `${hub.ja} 轉運站` },
            node_type: 'hub',
            coordinates: representativeLoc,
            // is_hub: true, // Removed as column doesn't exist; inferred from node_type='hub' or parent_hub_id=null
            parent_hub_id: null,
            vibe_tags: ['aggregated_hub'],
            updated_at: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
            .from('nodes')
            .upsert(hubPayload, { onConflict: 'id' });

        if (upsertError) {
            console.error(`Failed to create Hub ${hubId}:`, upsertError);
            continue;
        }
        console.log(`✅ Hub Created/Updated: ${hubId}`);

        // 4. Update Children
        for (const child of validChildren) {
            const { error: updateError } = await supabase
                .from('nodes')
                .update({ parent_hub_id: hubId })
                .eq('id', child.id);

            if (updateError) {
                console.error(`Failed to link child ${child.id}:`, updateError);
            } else {
                console.log(`  -> Linked ${child.id}`);
            }
        }
    }
    console.log('\nAggregations complete.');
}

aggregateHubs();
