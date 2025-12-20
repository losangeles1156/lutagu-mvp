
// Mock environment variables for Supabase client
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';
import { SEED_NODES } from '../src/lib/nodes/seedNodes';
import { mockProfiles } from '../src/lib/api/nodes';

async function verifyNodeData() {
    console.log('🔍 Starting Node Data Integrity Verification...\n');
    let errorCount = 0;
    let warningCount = 0;

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

    // 2. Verify Profile Keys and Mapping
    console.log('Checking mockProfiles keys and mapping...');
    const profileKeys = Object.keys(mockProfiles);
    const matchedNodes = new Set<string>();

    profileKeys.forEach(key => {
        // Check if this key maps to any node
        const matchingNodes = SEED_NODES.filter(node =>
            node.id === key
        );

        if (matchingNodes.length === 0) {
            console.warn(`⚠️  Orphan Profile Key: "${key}" does not strictly match any Seed Node ID or Exact Name.`);
            warningCount++;
        } else if (matchingNodes.length > 1) {
            console.error(`❌ Ambiguous Profile Key: "${key}" matches multiple nodes: ${matchingNodes.map(n => n.name.en).join(', ')}`);
            errorCount++;
        } else {
            matchedNodes.add(matchingNodes[0].id);
        }
    });
    console.log(`✅ Checked ${profileKeys.length} profile keys.\n`);

    // 3. Data Isolation Check (simulated)
    console.log('Checking for Potential Content Duplication...');
    const vibeMap = new Map<string, string>(); // content -> key

    profileKeys.forEach(key => {
        const profile = mockProfiles[key];
        if (profile.vibe_tags) {
            const vibeString = profile.vibe_tags.sort().join('|');
            if (vibeMap.has(vibeString)) {
                console.warn(`⚠️  Duplicate Vibe Tags detected between "${key}" and "${vibeMap.get(vibeString)}"`);
                warningCount++;
            } else {
                vibeMap.set(vibeString, key);
            }
        }
    });

    console.log('\n-----------------------------------');
    console.log(`Verification Complete.`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Warnings: ${warningCount}`);

    if (errorCount > 0) process.exit(1);
}

verifyNodeData().catch(console.error);
