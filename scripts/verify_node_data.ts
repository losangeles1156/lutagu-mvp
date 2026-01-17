
// Mock environment variables for Supabase client
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';
import { SEED_NODES } from '../src/lib/nodes/seedNodes';

async function verifyNodeData() {
    console.log('🔍 Starting Node Data Integrity Verification...\n');
    let errorCount = 0;

    // 1. Verify Unique IDs in SEED_NODES
    console.log('Checking SEED_NODES for duplicate IDs...');
    const seenIds = new Set<string>();
    SEED_NODES.forEach(node => {
        if (seenIds.has(node.id)) {
            console.error(`❌ Duplicate Node ID found: ${node.id}`);
            errorCount++;
        }
        seenIds.add(node.id);
    });
    console.log(`✅ Checked ${SEED_NODES.length} nodes for ID uniqueness.\n`);

    console.log('\n-----------------------------------');
    console.log(`Verification Complete.`);
    console.log(`Errors: ${errorCount}`);

    if (errorCount > 0) process.exit(1);
}

verifyNodeData().catch(console.error);
