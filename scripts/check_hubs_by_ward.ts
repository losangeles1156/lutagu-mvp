/**
 * Check hub distribution by ward
 * Run: npx tsx scripts/check_hubs_by_ward.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkHubsByWard() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('='.repeat(60));
    console.log('Hub Distribution by Ward');
    console.log('='.repeat(60));

    // Get all hubs with their ward info
    const { data: hubs, error } = await supabase
        .from('nodes')
        .select('id, name, is_hub, parent_hub_id, ward_id')
        .eq('is_hub', true)
        .eq('is_active', true);

    if (error) {
        console.log('❌ Error fetching hubs:', error.message);
        return;
    }

    console.log(`\nTotal hubs in database: ${hubs?.length || 0}`);

    // Group by ward
    const hubsByWard: Record<string, any[]> = {};
    const hubsWithoutWard: any[] = [];

    for (const hub of hubs || []) {
        if (hub.ward_id) {
            if (!hubsByWard[hub.ward_id]) {
                hubsByWard[hub.ward_id] = [];
            }
            hubsByWard[hub.ward_id].push(hub);
        } else {
            hubsWithoutWard.push(hub);
        }
    }

    // Get ward names
    const { data: wards } = await supabase
        .from('wards')
        .select('id, name_i18n');

    const wardNames: Record<string, string> = {};
    for (const ward of wards || []) {
        wardNames[ward.id] = ward.name_i18n?.['zh-TW'] || ward.name_i18n?.['ja'] || ward.id;
    }

    console.log('\n--- Hubs by Ward ---');
    for (const [wardId, wardHubs] of Object.entries(hubsByWard)) {
        console.log(`\n${wardNames[wardId] || wardId} (${wardId}): ${wardHubs.length} hubs`);
        for (const hub of wardHubs) {
            const name = typeof hub.name === 'object'
                ? (hub.name['zh-TW'] || hub.name['ja'] || hub.name['en'] || hub.id)
                : (hub.name || hub.id);
            console.log(`  - ${name} (${hub.id})`);
        }
    }

    if (hubsWithoutWard.length > 0) {
        console.log('\n--- Hubs without Ward Assignment ---');
        console.log(`Total: ${hubsWithoutWard.length}`);
        for (const hub of hubsWithoutWard) {
            const name = typeof hub.name === 'object'
                ? (hub.name['zh-TW'] || hub.name['ja'] || hub.name['en'] || hub.id)
                : (hub.name || hub.id);
            console.log(`  - ${name} (${hub.id})`);
        }
    }

    // Summary for specific wards
    console.log('\n' + '='.repeat(60));
    console.log('Summary for Key Wards');
    console.log('='.repeat(60));

    const keyWards = ['ward:shibuya', 'ward:shinagawa', 'ward:minato', 'ward:chuo'];
    for (const wardId of keyWards) {
        const count = hubsByWard[wardId]?.length || 0;
        const name = wardNames[wardId] || wardId;
        console.log(`${name}: ${count} hubs`);
    }

    console.log('\n' + '='.repeat(60));
}

checkHubsByWard().catch(console.error);
