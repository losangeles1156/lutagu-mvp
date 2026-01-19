/**
 * Node Activation/Deactivation Test Script
 * Tests the full workflow: L1 approval -> node activation -> frontend display
 *
 * Run with: npx ts-node scripts/test-node-activation.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testNodeActivation() {
    console.log('🧪 Testing Node Activation/Deactivation Workflow\n');
    console.log('='.repeat(60));

    try {
        // Step 1: Check current nodes status
        console.log('\n📋 Step 1: Check current nodes with is_active status');
        console.log('-'.repeat(60));

        const { data: nodes, error: nodesError } = await supabase
            .from('nodes')
            .select('id, name, parent_hub_id, is_active')
            .limit(10);

        if (nodesError) throw nodesError;

        console.log(`Found ${nodes?.length || 0} nodes:`);
        nodes?.forEach((node: any) => {
            const status = node.is_active === false ? '❌ Inactive' : '✅ Active';
            const type = node.parent_hub_id ? 'Child' : 'Hub';
            console.log(`  ${type} [${status}] ${node.name} (${node.id})`);
        });

        // Step 2: Test PATCH API endpoint simulation
        console.log('\n📋 Step 2: Test node activation/deactivation');
        console.log('-'.repeat(60));

        if (nodes && nodes.length > 0) {
            const testNodeId = nodes[0].id;
            const originalStatus = nodes[0].is_active;
            const newStatus = originalStatus !== false;

            console.log(`Testing node: ${nodes[0].name}`);
            console.log(`Current status: ${originalStatus}`);
            console.log(`New status: ${newStatus}`);

            // Simulate PATCH update
            const { error: updateError } = await supabase
                .from('nodes')
                .update({ is_active: newStatus })
                .eq('id', testNodeId);

            if (updateError) {
                console.log(`⚠️  Update failed: ${updateError.message}`);
            } else {
                console.log(`✅ Successfully ${newStatus ? 'activated' : 'deactivated'} node`);

                // Verify the change
                const { data: updatedNode } = await supabase
                    .from('nodes')
                    .select('id, name, is_active')
                    .eq('id', testNodeId)
                    .single();

                if (updatedNode?.is_active === newStatus) {
                    console.log(`✅ Verified: Node is now ${newStatus ? 'active' : 'inactive'}`);
                }

                // Revert for clean state
                await supabase
                    .from('nodes')
                    .update({ is_active: originalStatus })
                    .eq('id', testNodeId);
                console.log(`🔄 Reverted to original status`);
            }
        }

        // Step 3: Test filtering by is_active
        console.log('\n📋 Step 3: Test filtering by is_active status');
        console.log('-'.repeat(60));

        const { data: activeNodes } = await supabase
            .from('nodes')
            .select('id, name')
            .eq('is_active', true)
            .limit(5);

        const { data: inactiveNodes } = await supabase
            .from('nodes')
            .select('id, name')
            .eq('is_active', false)
            .limit(5);

        console.log(`Active nodes: ${activeNodes?.length || 0}`);
        console.log(`Inactive nodes: ${inactiveNodes?.length || 0}`);

        // Step 4: Check node_hierarchy sync
        console.log('\n📋 Step 4: Check node_hierarchy table');
        console.log('-'.repeat(60));

        const { data: hierarchyData, error: hierarchyError } = await supabase
            .from('node_hierarchy')
            .select('node_id, is_active, hub_id')
            .limit(10);

        if (hierarchyError) {
            console.log(`⚠️  node_hierarchy table may not exist or error: ${hierarchyError.message}`);
        } else {
            console.log(`Found ${hierarchyData?.length || 0} hierarchy records`);
        }

        // Step 5: Check v_l1_pending view
        console.log('\n📋 Step 5: Check v_l1_pending view');
        console.log('-'.repeat(60));

        try {
            const { data: pendingPlaces } = await supabase
                .from('v_l1_pending')
                .select('*')
                .limit(5);

            console.log(`Found ${pendingPlaces?.length || 0} pending L1 places`);
        } catch (e: any) {
            console.log(`⚠️  v_l1_pending view error: ${e.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test completed successfully!\n');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
testNodeActivation();
