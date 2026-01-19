/**
 * Identify and mark transfer stations as hubs with correct ID format
 * Run: npx tsx scripts/identify_and_mark_hubs_v2.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Known major hub stations in Tokyo - using correct ID format (odpt:Station: not odpt.Station:)
const majorHubs = [
    // Shibuya Ward
    { id: 'odpt:Station:JR-East.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:TokyoMetro.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:Tokyu.Toyoko.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:Tokyu.DenEnToshi.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:Keio.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:JR-East.Ebisu', ward: 'ward:shibuya' },
    { id: 'odpt:Station:JR-East.Daikanyama', ward: 'ward:shibuya' },
    { id: 'odpt:Station:Tokyu.Toyoko.Daikanyama', ward: 'ward:shibuya' },
    { id: 'odpt:Station:TokyoMetro.Fukutoshin.Shibuya', ward: 'ward:shibuya' },
    { id: 'odpt:Station:TokyoMetro.Hanzomon.Shibuya', ward: 'ward:shibuya' },

    // Shinagawa Ward
    { id: 'odpt:Station:JR-East.Shinagawa', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:JR-East.Osaki', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:JR-East.Gotanda', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:JR-East.Tamachi', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:TokyoMetro.Namboku.Shinagawa', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:Toei.Mita.Tamachi', ward: 'ward:shinagawa' },
    { id: 'odpt:Station:JR-East.Meguro', ward: 'ward:shinagawa' },

    // Minato Ward
    { id: 'odpt:Station:Toei.Oedo.Roppongi', ward: 'ward:minato' },
    { id: 'odpt:Station:TokyoMetro.Hibiya.Roppongi', ward: 'ward:minato' },
    { id: 'odpt:Station:TokyoMetro.Shimbashi', ward: 'ward:minato' },
    { id: 'odpt:Station:JR-East.Hamamatsucho', ward: 'ward:minato' },
    { id: 'odpt:Station:TokyoMetro.Omotesando', ward: 'ward:minato' },
    { id: 'odpt:Station:TokyoMetro.Akasakamitsuke', ward: 'ward:minato' },
    { id: 'odpt:Station:TokyoMetro.Hiroo', ward: 'ward:minato' },

    // Chuo Ward
    { id: 'odpt:Station:TokyoMetro.Ginza', ward: 'ward:chuo' },
    { id: 'odpt:Station:TokyoMetro.Nihombashi', ward: 'ward:chuo' },
    { id: 'odpt:Station:Toei.Nihombashi', ward: 'ward:chuo' },
    { id: 'odpt:Station:TokyoMetro.Kayabacho', ward: 'ward:chuo' },
    { id: 'odpt:Station:TokyoMetro.Hibiya', ward: 'ward:chuo' },
    { id: 'odpt:Station:Toei.Hibiya', ward: 'ward:chuo' },
    { id: 'odpt:Station:JR-East.Hatchobori', ward: 'ward:chuo' },
    { id: 'odpt:Station:TokyoMetro.Tsukiji', ward: 'ward:chuo' },

    // Shinjuku Ward
    { id: 'odpt:Station:JR-East.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:TokyoMetro.Marunouchi.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:Toei.Oedo.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:Keio.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:Odakyu.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:Seibu.Shinjuku', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:JR-East.Iidabashi', ward: 'ward:shinjuku' },
    { id: 'odpt:Station:Toei.Shinjuku.Higashishinjuku', ward: 'ward:shinjuku' },

    // Taito Ward
    { id: 'odpt:Station:JR-East.Ueno', ward: 'ward:taito' },
    { id: 'odpt:Station:TokyoMetro.Ueno', ward: 'ward:taito' },
    { id: 'odpt:Station:JR-East.Okachimachi', ward: 'ward:taito' },
    { id: 'odpt:Station:Toei.Oedo.Ueno', ward: 'ward:taito' },
    { id: 'odpt:Station:Keisei.Ueno', ward: 'ward:taito' },
    { id: 'odpt:Station:TokyoMetro.Ginza.Asakusa', ward: 'ward:taito' },
    { id: 'odpt:Station:Toei.Asakusa', ward: 'ward:taito' },
    { id: 'odpt:Station:Toei.ShinOkachimachi', ward: 'ward:taito' },

    // Toshima Ward
    { id: 'odpt:Station:JR-East.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt:Station:TokyoMetro.Yurakucho.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt:Station:Seibu.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt:Station:Tobu.Ikebukuro', ward: 'ward:toshima' },
    { id: 'odpt:Station:JR-East.Otsuka', ward: 'ward:toshima' },
    { id: 'odpt:Station:TokyoMetro.Fukutoshin.Ikebukuro', ward: 'ward:toshima' },

    // Other key hubs
    { id: 'odpt:Station:JR-East.Tokyo', ward: 'ward:chuo' },
    { id: 'odpt:Station:JR-East.Akihabara', ward: 'ward:chuo' },
    { id: 'odpt:Station:JR-East.Kanda', ward: 'ward:chuo' },
    { id: 'odpt:Station:Toei.Jimbocho', ward: 'ward:chiyoda' },
    { id: 'odpt:Station:Toei.Kudanshita', ward: 'ward:chiyoda' },
    { id: 'odpt:Station:Toei.Ichigaya', ward: 'ward:shinjuku' },
];

async function identifyAndMarkHubs() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('='.repeat(60));
    console.log('Hub Identification (v2 - Correct ID Format)');
    console.log('='.repeat(60));

    let markedAsHub = 0;
    let alreadyHub = 0;
    let notFound = 0;
    const foundStations: string[] = [];

    for (const hub of majorHubs) {
        const { data: existing, error: checkError } = await supabase
            .from('nodes')
            .select('id, is_hub, name')
            .eq('id', hub.id)
            .single();

        if (checkError || !existing) {
            // Don't log every missing station, just count
            notFound++;
            continue;
        }

        foundStations.push(hub.id);

        if (existing.is_hub) {
            alreadyHub++;
        } else {
            const { error: updateError } = await supabase
                .from('nodes')
                .update({ is_hub: true })
                .eq('id', hub.id);

            if (updateError) {
                console.log(`❌ Error marking ${hub.id}: ${updateError.message}`);
            } else {
                markedAsHub++;
            }
        }
    }

    console.log(`\n✓ Found in database: ${foundStations.length}`);
    console.log(`✓ Newly marked as hub: ${markedAsHub}`);
    console.log(`✓ Already were hubs: ${alreadyHub}`);
    console.log(`⚠️ Not found in database: ${notFound}`);

    console.log('\n--- Found Stations ---');
    for (const id of foundStations) {
        console.log(id);
    }

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

    const { data: nodes } = await supabase
        .from('nodes')
        .select('id, coordinates, is_hub, parent_hub_id')
        .eq('is_active', true);

    if (!nodes || nodes.length === 0) {
        console.log('❌ No nodes found');
        return;
    }

    console.log(`Processing ${nodes.length} nodes, ${wards.length} wards...`);

    let assigned = 0;
    let errors = 0;

    for (const node of nodes) {
        try {
            let coords: [number, number] | null = null;

            if (typeof node.coordinates === 'string') {
                // Parse "POINT(lng lat)" format
                const match = node.coordinates.match(/POINT\(([^)]+)\)/);
                if (match) {
                    const parts = match[1].trim().split(/\s+/);
                    if (parts.length >= 2) {
                        coords = [parseFloat(parts[0]), parseFloat(parts[1])];
                    }
                }
            } else if (node.coordinates?.coordinates) {
                coords = [node.coordinates.coordinates[0], node.coordinates.coordinates[1]];
            } else if (Array.isArray(node.coordinates)) {
                coords = [node.coordinates[0], node.coordinates[1]];
            }

            if (!coords) continue;

            let nearestWard: any = null;
            let nearestDist = Infinity;

            for (const ward of wards) {
                if (!ward.center_point?.coordinates) continue;

                const [lng, lat] = ward.center_point.coordinates;
                const dist = Math.sqrt(
                    Math.pow(coords[0] - lng, 2) +
                    Math.pow(coords[1] - lat, 2)
                );

                if (dist < nearestDist && dist < 0.1) {
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
    console.log('Hub identification complete!');
    console.log('='.repeat(60));
}

identifyAndMarkHubs().catch(console.error);
