
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Manually load .env.local before importing client
dotenv.config({ path: '.env.local' });

async function generateTopology() {
    // Dynamic import to ensure env vars are loaded first
    const { odptClient } = await import('@/lib/odpt/client');

    console.log('Fetching railways...');
    console.log('Fetching railways...');

    // Target Operators
    const operators = [
        'odpt.Operator:JR-East',
        'odpt.Operator:TokyoMetro',
        'odpt.Operator:Toei'
    ];

    const allRailways: any[] = [];

    for (const op of operators) {
        try {
            console.log(`Fetching ${op}...`);
            const railways = await odptClient.getRailways(op);
            console.log(`Fetched ${railways.length} railways for ${op}`);

            // Filter out Shinkansen and other non-standard lines if needed,
            // but for now let's keep it simple and take everything
            const filtered = railways.filter(r => {
                const id = r['owl:sameAs'] || '';
                // Avoid bus lines or other non-railway things if they appear
                return id.startsWith('odpt.Railway:');
            });
            console.log(`Kept ${filtered.length} railway lines`);

            allRailways.push(...filtered);
        } catch (e) {
            console.error(`Error fetching ${op}:`, e);
        }
    }

    // Transform to internal format
    const topology = allRailways.map(r => ({
        railwayId: r['owl:sameAs'],
        operator: r['odpt:operator'],
        title: r['odpt:railwayTitle'],
        stationOrder: (r['odpt:stationOrder'] || []).map((s: any) => ({
            index: s['odpt:index'],
            station: s['odpt:station'],
            title: s['odpt:stationTitle']
        }))
    }));

    const outputPath = path.join(process.cwd(), 'src/lib/l4/generated/coreTopology.json');
    // Ensure dir exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(topology, null, 2));
    console.log(`Saved topology with ${topology.length} lines to ${outputPath}`);
}

generateTopology();
