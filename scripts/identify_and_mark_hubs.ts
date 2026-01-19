/**
 * Identify and mark transfer stations as hubs
 * Run: npx tsx scripts/identify_and_mark_hubs.ts
 *
 * Hub criteria:
 * 1. Station has multiple operators (JR + Tokyo Metro + Private railway)
 * 2. Station is a major interchange with high traffic
 * 3. Station coordinates match multiple different station IDs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Known major hub stations in Tokyo
const majorHubs = [
    // Shibuya Ward
    { id: 'odpt.Station:JR-East.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:JR-East.Ebisu', ward: 'ward:shibuya' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:TokyoMetro.Fukutoshin.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:Tokyu.Toyoko.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:Tokyu.DenEnToshi.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:Keio.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt.Station:JR-East.Daikanyama', ward: 'ward:shibuya' },
    { id: 'odpt.Station:Tokyu.Toyoko.Daikanyama', ward: 'ward:shibuya' },

    // Shinagawa Ward
    { id: 'odpt.Station:JR-East.Shinagawa', ward: 'ward:shinagawa' },
    { id: 'odpt.Station:JR-East.Osaki', ward: 'ward:shinagawa' },
    { id: 'odpt.Station:JR-East.Gotanda', ward: 'ward:shinagawa' },
    { id: 'odpt.Station:JR-East.Tamachi', ward: 'ward:shinagawa' },
    { id: 'odpt.Station:TokyoMetro.Namboku.Shinagawa', ward: 'ward:shinagawa' },
    { id: 'odpt.Station:Toei.Mita.Tamachi', ward: 'ward:shinagawa' },

    // Minato Ward
    { id: 'odpt.Station:Toei.Oedo.Roppongi', ward: 'ward:minato' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Roppongi', ward: 'ward:minato' },
    { id: 'odpt.Station:Toei.Mita.Shimbashi', ward: 'ward:minato' },
    { id: 'odpt.Station:JR-East.Shibauramitsu', ward: 'ward:minato' },
    { id: 'odpt.Station:TokyoMetro.Ginza.AkasakaMitsuke', ward: 'ward:minato' },
    { id: 'odpt.Station:TokyoMetro.Marunouchi.AkasakaMitsuke', ward: 'ward:minato' },
    { id: 'odpt.Station:Toei.Oedo.AkasakaMitsuke', ward: 'ward:minato' },

    // Chuo Ward
    { id: 'odpt.Station:TokyoMetro.Ginza', ward: 'ward:chuo' },
    { id: 'odpt.Station:TokyoMetro.Nihombashi', ward: 'ward:chuo' },
    { id: 'odpt.Station:TokyoMetro.Kayabacho', ward: 'ward:chuo' },
    { id: 'odpt.Station:TokyoMetro.Hibiya', ward: 'ward:chuo' },
    { id: 'odpt.Station:Toei.Shinjuku.Higashishinjuku', ward: 'ward:chuo' },
    { id: 'odpt.Station:JR-East.Kanda', ward: 'ward:chuo' },  // Already a hub

    // Shinjuku Ward
    { id: 'odpt.Station:TokyoMetro.Marunouchi.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt.Station:Toei.Oedo.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt.Station:Keio.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt.Station:Odakyu.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt.Station:Seibu.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt.Station:JR-East.SeijoYamate', ward: 'ward:shinjuku' },

    // Taito Ward
    { id: 'odpt.Station:TokyoMetro.Ginza.Ueno', ward: 'ward:taito' },
    { id: 'odpt.Station:TokyoMetro.Hibiya.Ueno', ward: 'ward:taito' },
    { id: 'odpt.Station:Keisei.Ueno', ward: 'ward:taito' },

    // Other major hubs
    { id: 'odpt.Station:JR-East.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt.Station:Seibu.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt.Station:Tobu.Ikebukuro', ward: 'ward:toshima' },

    { id: 'odpt.Station:JR-East.Ginza', ward: 'ward:chuo' },
];

async function identifyAndMarkHubs() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('='.repeat(60));
    console.log('Hub Identification and Marking');
    console.log('='.repeat(60));

    let markedAsHub = 0;
    let alreadyHub = 0;
    let notFound = 0;

    for (const hub of majorHubs) {
        // First check if node exists
        const { data: existing, error: checkError } = await supabase
            .from('nodes')
            .select('id, is_hub, name')
            .eq('id', hub.id)
            .single();

        if (checkError || !existing) {
            console.log(`⚠️ Not found: ${hub.id}`);
            notFound++;
            continue;
        }

        if (existing.is_hub) {
            console.log(`✓ Already hub: ${existing.name || hub.id}`);
            alreadyHub++;
        } else {
            // Mark as hub
            const { error: updateError } = await supabase
                .from('nodes')
                .update({ is_hub: true })
                .eq('id', hub.id);

            if (updateError) {
                console.log(`❌ Error marking ${hub.id}: ${updateError.message}`);
            } else {
                console.log(`✓ Marked as hub: ${existing.name || hub.id}`);
                markedAsHub++;
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Summary:`);
    console.log(`  ✓ Newly marked as hub: ${markedAsHub}`);
    console.log(`  ✓ Already were hubs: ${alreadyHub}`);
    console.log(`  ⚠️ Not found in database: ${notFound}`);
    console.log('='.repeat(60));

    // Now re-run ward assignment
    console.log('\n[Step 2] Re-assigning nodes to wards...');

    const { data: wards } = await supabase
        .from('wards')
        .select('id, name_i18n, center_point')
        .eq('is_active', true);

    if (!wards || wards.length === 0) {
        console.log('❌ No wards found');
        return;
    }

    // Get all active nodes
    const { data: nodes } = await supabase
        .from('nodes')
        .select('id, coordinates, is_hub, parent_hub_id')
        .eq('is_active', true);

    if (!nodes || nodes.length === 0) {
        console.log('❌ No nodes found');
        return;
    }

    console.log(`Found ${nodes.length} nodes, ${wards.length} wards`);

    let assigned = 0;
    let errors = 0;

    for (const node of nodes) {
        try {
            let coords: [number, number] | null = null;

            if (node.coordinates?.coordinates) {
                coords = [node.coordinates.coordinates[0], node.coordinates.coordinates[1]];
            } else if (Array.isArray(node.coordinates)) {
                coords = [node.coordinates[0], node.coordinates[1]];
            }

            if (!coords) continue;

            // Find nearest ward by center point
            let nearestWard: any = null;
            let nearestDist = Infinity;

            for (const ward of wards) {
                if (!ward.center_point?.coordinates) continue;

                const [lng, lat] = ward.center_point.coordinates;
                const dist = Math.sqrt(
                    Math.pow(coords[0] - lng, 2) +
                    Math.pow(coords[1] - lat, 2)
                );

                if (dist < nearestDist && dist < 0.1) { // Within ~10km
                    nearestDist = dist;
                    nearestWard = ward;
                }
            }

            if (nearestWard) {
                const { error } = await supabase
                    .from('nodes')
                    .update({ ward_id: nearestWard.id })
                    .eq('id', node.id);

                if (error) {
                    errors++;
                } else {
                    assigned++;
                }
            }
        } catch (e) {
            errors++;
        }

        if (assigned % 100 === 0) {
            process.stdout.write(`\r  Progress: ${assigned}/${nodes.length} nodes processed...`);
        }
    }

    console.log(`\r  Progress: ${nodes.length}/${nodes.length} nodes processed...`);
    console.log(`\n  Results: ${assigned} assigned, ${errors} errors`);

    // Update ward statistics
    console.log('\n[Step 3] Updating ward statistics...');

    for (const ward of wards) {
        const { count: nodeCount } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .eq('is_active', true);

        const { count: hubCount } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .eq('is_hub', true)
            .eq('is_active', true);

        await supabase
            .from('wards')
            .update({
                node_count: nodeCount || 0,
                hub_count: hubCount || 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', ward.id);

        const name = ward.name_i18n?.['zh-TW'] || ward.name_i18n?.['ja'] || ward.id;
        console.log(`  ✓ ${name}: ${nodeCount} nodes, ${hubCount} hubs`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Hub identification and ward assignment complete!');
    console.log('='.repeat(60));
}

identifyAndMarkHubs().catch(console.error);
