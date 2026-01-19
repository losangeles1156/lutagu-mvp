
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { resolveNodeInheritance } from '../src/lib/nodes/inheritance';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('--- Verifying Hub Data ---');

    // 1. Check Hub:Ueno
    const { data: uenoHub } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', 'Hub:Ueno')
        .single();

    console.log('Hub:Ueno:', uenoHub ? '✅ Found' : '❌ Missing');
    if (uenoHub) {
        console.log('  Type:', uenoHub.node_type);
        console.log('  Parent:', uenoHub.parent_hub_id);
    }

    // 2. Check Children of Ueno
    const { data: children } = await supabase
        .from('nodes')
        .select('id, name, parent_hub_id')
        .eq('parent_hub_id', 'Hub:Ueno');

    console.log(`Children of Hub:Ueno (${children?.length || 0}):`);
    children?.forEach(c => console.log(`  - ${c.id}`));

    const sampleChildId = children?.[0]?.id;
    if (sampleChildId) {
        const resolved = await resolveNodeInheritance({ nodeId: sampleChildId, client: supabase });
        const leaf = resolved?.leaf;
        const hub = resolved?.hub;
        const effective = resolved?.effective;

        console.log(`\n--- Inheritance Sample (${sampleChildId}) ---`);
        console.log('Leaf:', leaf?.id);
        console.log('Hub:', hub?.id || null);
        console.log('Effective Persona Present:', Boolean(String(effective?.persona_prompt || '').trim()));
        console.log('Effective Commercial Rules Count:', Array.isArray(effective?.commercial_rules) ? effective?.commercial_rules.length : 0);
    }

    // 3. Check Hub:Shinjuku
    const { data: shinjukuHub } = await supabase
        .from('nodes')
        .select('id')
        .eq('id', 'Hub:Shinjuku')
        .single();
    console.log('Hub:Shinjuku:', shinjukuHub ? '✅ Found' : '❌ Missing');
}

verify();
