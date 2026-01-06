/**
 * Debug script to check nodes visibility issues
 * Run: npx tsx scripts/debug_nodes_visibility.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
    console.log('='.repeat(60));
    console.log('Lutagu Nodes Visibility Debug Report');
    console.log('='.repeat(60));

    // 1. Check Supabase connection
    console.log('\n[1] Supabase Connection Check');
    console.log('-'.repeat(40));
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ ERROR: Supabase credentials missing!');
        return;
    }
    console.log('✓ Supabase credentials present');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Check RPC functions
    console.log('\n[2] RPC Function Check');
    console.log('-'.repeat(40));

    // Check nearby_nodes_v2
    try {
        const { data: rpc1, error: err1 } = await supabase
            .rpc('nearby_nodes_v2', {
                center_lat: 35.7138,
                center_lon: 139.7773,
                radius_meters: 5000,
                max_results: 10
            });
        if (err1) {
            console.log('❌ nearby_nodes_v2:', err1.message.substring(0, 80));
        } else {
            console.log('✓ nearby_nodes_v2 works! Returned', (rpc1 || []).length, 'nodes');
        }
    } catch (e: any) {
        console.log('❌ nearby_nodes_v2 exception:', e.message);
    }

    // Check nearby_nodes (fallback)
    try {
        const { data: rpc2, error: err2 } = await supabase
            .rpc('nearby_nodes', {
                center_lat: 35.7138,
                center_lon: 139.7773,
                radius_meters: 5000
            });
        if (err2) {
            console.log('❌ nearby_nodes:', err2.message.substring(0, 80));
        } else {
            console.log('✓ nearby_nodes works! Returned', (rpc2 || []).length, 'nodes');
        }
    } catch (e: any) {
        console.log('❌ nearby_nodes exception:', e.message);
    }

    // 3. Direct query to nodes table
    console.log('\n[3] Direct Nodes Query');
    console.log('-'.repeat(40));

    const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('id, name, is_hub, parent_hub_id, coordinates')
        .limit(100);

    if (nodesError) {
        console.log('❌ Error fetching nodes:', nodesError.message);
    } else {
        console.log(`✓ Fetched ${nodes?.length || 0} nodes directly from table`);

        if (nodes && nodes.length > 0) {
            // Analyze visibility
            const visibleCount = nodes.filter((n: any) => n.parent_hub_id === null).length;
            const hiddenCount = nodes.filter((n: any) => n.parent_hub_id !== null).length;
            const hubCount = nodes.filter((n: any) => n.is_hub === true).length;

            console.log(`\n  Visibility Analysis:`);
            console.log(`    Visible (parent_hub_id=null): ${visibleCount}`);
            console.log(`    Hidden (parent_hub_id!=null): ${hiddenCount}`);
            console.log(`    is_hub=true: ${hubCount}`);

            // Check coordinates
            const nodesWithCoords = nodes.filter((n: any) => n.coordinates);
            console.log(`\n  Coordinates:`);
            console.log(`    Nodes with coordinates: ${nodesWithCoords.length}`);

            if (nodesWithCoords.length > 0) {
                const sample = nodesWithCoords[0] as any;
                console.log(`    Sample:`, JSON.stringify(sample.coordinates).substring(0, 100));
            }

            // Show sample
            console.log(`\n  Sample Nodes:`);
            nodes.slice(0, 5).forEach((n: any) => {
                const status = n.parent_hub_id === null ? '✓' : '✗';
                const nameObj = n.name as any;
                const name = nameObj?.['zh-TW'] || nameObj?.['ja'] || 'Unknown';
                console.log(`    ${status} ${name}`);
            });
        }
    }

    // 4. Check hub tables
    console.log('\n[4] Hub Metadata Tables');
    console.log('-'.repeat(40));

    const { data: hubMetadata } = await supabase
        .from('hub_metadata')
        .select('hub_id, transfer_type, is_active');

    const { data: hubMembers } = await supabase
        .from('hub_members')
        .select('hub_id, member_id, is_active');

    console.log(`hub_metadata: ${hubMetadata?.length || 0} rows`);
    console.log(`hub_members: ${hubMembers?.length || 0} rows`);

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));

    console.log('\n  Key Findings:');

    const rpcV2Works = !((await supabase.rpc('nearby_nodes_v2', { center_lat: 0, center_lon: 0, radius_meters: 1, max_results: 1 })) as any).error;
    console.log(`    1. nearby_nodes_v2 RPC: ${rpcV2Works ? '✓ Working' : '❌ Missing'}`);

    if (nodes) {
        const visibleCount = nodes.filter((n: any) => n.parent_hub_id === null).length;
        console.log(`    2. Direct table query: ${nodes.length} nodes, ${visibleCount} visible`);

        if (visibleCount === 0) {
            console.log('\n  🚨 CRITICAL: No nodes would be visible on map!');
            console.log('     All nodes have parent_hub_id set incorrectly.');
        } else if (visibleCount < nodes.length * 0.1) {
            console.log('\n  ⚠️  WARNING: Very few nodes visible (< 10%)');
        } else {
            console.log('\n  ✓ Node visibility looks healthy');
        }
    }

    console.log('\n  Recommendations:');
    if (!rpcV2Works) {
        console.log('    1. Create nearby_nodes_v2 RPC function in Supabase');
        console.log('    2. Or use Supabase Dashboard SQL Editor to run the migration');
    }
    console.log('    3. Verify API fallback mode is working correctly');

    console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
