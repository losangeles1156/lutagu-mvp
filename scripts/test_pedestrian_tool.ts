
import { PedestrianAccessibilityTool } from '@/lib/agent/tools/pedestrianTools';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('🧪 Testing Pedestrian Accessibility Tool (AI Agent Mode)...');

    const tool = new PedestrianAccessibilityTool();

    // Test Case: Shinjuku Station Area (Known to have data if ingestion worked)
    // Or Yoyogi since user provided Yoyogi data specifically in the first prompt
    // Yoyogi Station: Lat 35.6830, Lon 139.7020
    const testLocation = {
        lat: 35.6830,
        lon: 139.7020,
        radius: 200 // 200m radius
    };

    console.log(`\n📍 Scanning location: ${testLocation.lat}, ${testLocation.lon} (Radius: ${testLocation.radius}m)`);

    try {
        const result = await tool.execute(testLocation, { nodeId: 'test-agent', level: 'L3_FACILITY' } as any);

        console.log('\n--- Tool Output ---');
        console.log(`Source: ${result.source}`);

        if (result.source === 'optimized_rpc') {
            console.log(`✅ SUCCESS: Used optimized DB function.`);
            console.log(`Items found: ${result.count}`);
            if (result.count > 0) {
                console.log('Sample Data (First 3 items):');
                console.log(JSON.stringify(result.data.slice(0, 3), null, 2));
            } else {
                console.warn('⚠️ No items found. Check if data ingestion was successful for this area.');
            }
        } else {
            console.warn(`⚠️ FALLBACK: Used client-side query. RPC function might be missing or failed.`);
            console.log('Data sample:', JSON.stringify(result.data?.slice(0, 2), null, 2));
        }

    } catch (err) {
        console.error('❌ Tool Execution Failed:', err);
    }
}

main();
