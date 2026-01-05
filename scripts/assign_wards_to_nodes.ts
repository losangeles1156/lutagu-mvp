
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SEED_NODES } from '../src/lib/nodes/seedNodes'; // Ensure we can import this

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const WARDS = [
    { id: 'ward:taito', name: 'Taito', keywords: ['Taito', '台東区', 'Ueno', 'Asakusa', 'Okachimachi', 'Kuramae', 'Asakusabashi', 'Iriya', 'Minowa', 'Uguisudani'] },
    { id: 'ward:chiyoda', name: 'Chiyoda', keywords: ['Chiyoda', '千代田区', 'Tokyo Station', 'Otemachi', 'Marunouchi', 'Hibiya', 'Akihabara', 'Kanda', 'Jimbocho', 'Ochanomizu', 'Tokyo'] },
    { id: 'ward:chuo', name: 'Chuo', keywords: ['Chuo', '中央区', 'Ginza', 'Nihombashi', 'Kyobashi', 'Tsukiji', 'Hatchobori', 'Ningyocho', 'Mitsukoshi', 'Suitengumae'] },
    { id: 'ward:minato', name: 'Minato', keywords: ['Minato', '港区', 'Shimbashi', 'Hamamatsucho', 'Tamachi', 'Shinagawa', 'Roppongi', 'Akasaka', 'Omotesando', 'Aoyama'] },
    { id: 'ward:shinjuku', name: 'Shinjuku', keywords: ['Shinjuku', '新宿区', 'Takadanobaba', 'Yotsuya', 'Kagurazaka'] },
    { id: 'ward:shibuya', name: 'Shibuya', keywords: ['Shibuya', '渋谷区', 'Harajuku', 'Ebisu', 'Daikanyama', 'Hiroo'] },
    { id: 'ward:toshima', name: 'Toshima', keywords: ['Toshima', '豊島区', 'Ikebukuro', 'Otsuka', 'Sugamo'] },
    { id: 'ward:bunkyo', name: 'Bunkyo', keywords: ['Bunkyo', '文京区', 'Korakuen', 'Hongo'] },
    { id: 'ward:sumida', name: 'Sumida', keywords: ['Sumida', '墨田区', 'Oshiage', 'Skytree', 'Kinshicho', 'Ryogoku'] },
    { id: 'ward:koto', name: 'Koto', keywords: ['Koto', '江東区', 'Toyosu', 'Monzen-nakacho'] }
];

async function assignWards() {
    console.log('Starting Ward Assignment (Seed-based)...');

    const updates = [];
    const wardCounts: Record<string, number> = {};

    // 1. Iterate through SEED_NODES which definitely have address/metadata
    for (const seed of SEED_NODES) {
        let assignedWardId = null;

        // Check explicit address if available
        const address = JSON.stringify(seed.address || ''); // Handle JSONB or string
        for (const ward of WARDS) {
            // Check Address (English or Japanese)
            if (address.includes(ward.name) || (ward.keywords[1] && address.includes(ward.keywords[1]))) {
                assignedWardId = ward.id;
                break;
            }
        }

        // Check Name/ID Keywords
        if (!assignedWardId) {
            const nameStr = JSON.stringify(seed.name);
            const combinedText = (seed.id + ' ' + nameStr).toLowerCase();

            for (const ward of WARDS) {
                for (const kw of ward.keywords) {
                    if (combinedText.includes(kw.toLowerCase())) {
                        assignedWardId = ward.id;
                        break;
                    }
                }
                if (assignedWardId) break;
            }
        }

        // Strategy 3: Special override for Akihabara (often associated with Chiyoda despite being on border)
        // Note: Akihabara Station JR is in Chiyoda
        if (seed.id.includes('Akihabara') && !assignedWardId) {
            assignedWardId = 'ward:chiyoda';
        }

        if (assignedWardId) {
            updates.push({
                id: seed.id,
                ward_id: assignedWardId
            });
            wardCounts[assignedWardId] = (wardCounts[assignedWardId] || 0) + 1;
        }
    }

    console.log(`Prepared ${updates.length} ward assignments from Seed Nodes.`);
    console.log('Breakdown:', wardCounts);

    // Batch update to DB
    // Only update nodes that exist
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        // Parallel updates for batch
        const promises = batch.map(u =>
            supabase.from('nodes').update({ ward_id: u.ward_id }).eq('id', u.id)
        );

        await Promise.all(promises);
        console.log(`Processed batch ${i} - ${i + batch.length}`);
    }

    // Also assign wards for ANY node in DB that is not in SEED_NODES but matches keywords?
    // Let's do a quick pass on unassigned nodes in DB
    const { data: pendingNodes } = await supabase.from('nodes').select('id, name').is('ward_id', null).limit(1000);
    if (pendingNodes && pendingNodes.length > 0) {
        console.log(`Analyzing ${pendingNodes.length} remaining unassigned nodes in DB...`);
        const extraUpdates = [];

        for (const node of pendingNodes) {
            let assignedWardId = null;
            const combinedText = (node.id + ' ' + JSON.stringify(node.name)).toLowerCase();

            for (const ward of WARDS) {
                for (const kw of ward.keywords) {
                    if (combinedText.includes(kw.toLowerCase())) {
                        assignedWardId = ward.id;
                        break;
                    }
                }
                if (assignedWardId) break;
            }

            if (assignedWardId) {
                extraUpdates.push({ id: node.id, ward_id: assignedWardId });
            }
        }

        if (extraUpdates.length > 0) {
            console.log(`Found ${extraUpdates.length} extra assignments.`);
            for (let i = 0; i < extraUpdates.length; i += BATCH_SIZE) {
                const batch = extraUpdates.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(u => supabase.from('nodes').update({ ward_id: u.ward_id }).eq('id', u.id)));
                console.log(`Processed extra batch ${i}`);
            }
        }
    }

    // Update Ward Stats
    console.log('Updating Ward Statistics...');
    for (const wardId of Object.keys(wardCounts)) {
        try {
            // Fallback: Manual count update
            const { count } = await supabase.from('nodes').select('*', { count: 'exact', head: true }).eq('ward_id', wardId);
            const { count: hubs } = await supabase.from('nodes').select('*', { count: 'exact', head: true }).eq('ward_id', wardId).maybeSingle(); // Incorrect query for hubs, just checking logic

            // Correct count
            const { count: realHubs } = await supabase.from('nodes').select('*', { count: 'exact', head: true }).eq('ward_id', wardId).is('parent_hub_id', null);

            await supabase.from('wards').update({
                node_count: count,
                hub_count: realHubs
            }).eq('id', wardId);
            console.log(`Updated ${wardId}: ${count} nodes, ${realHubs} hubs`);
        } catch (err) {
            console.error(`Error updating stats for ${wardId}`, err);
        }
    }

    console.log('Ward Assignment Complete.');
}

assignWards().catch(console.error);
