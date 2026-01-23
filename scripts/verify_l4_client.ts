
import { rustL4Client } from '../src/lib/services/RustL4Client';
import { RailwayTopology } from '../src/lib/l4/types/RoutingTypes';

async function verifyL4Client() {
    console.log('--- Verifying RustL4Client Integration ---');

    // Mock minimal railway topology to avoid needing full data load for this test
    // In a real app, this comes from the loaded RoutingGraph/Topology
    const railways: RailwayTopology[] = [];

    // Using validated Yamanote IDs
    const originId = 'odpt.Station:JR-East.Yamanote.Tokyo';
    const destinationId = 'odpt.Station:JR-East.Yamanote.Shinjuku';

    console.log(`Requesting route: ${originId} -> ${destinationId}`);
    console.log(`Locale: zh-TW`);

    try {
        const start = Date.now();
        const routes = await rustL4Client.findRoutes({
            originId,
            destinationId,
            locale: 'zh-TW',
            railways,
        });
        const duration = Date.now() - start;

        console.log(`\n✅ Client returned in ${duration}ms`);

        if (routes.length > 0) {
            console.log(`✅ Success! Received ${routes.length} routes.`);
            console.log('--- Route 1 Summary ---');
            const r1 = routes[0];
            console.log(`Label: ${r1.label}`);
            console.log(`Duration: ${r1.duration} min`);
            console.log(`Transfers: ${r1.transfers}`);
            console.log(`Steps: ${r1.steps.length}`);

            r1.steps.forEach((s, i) => {
                console.log(`  Step ${i + 1}: [${s.kind}] ${s.text}`);
            });
        } else {
            console.warn('⚠️ Service returned 0 routes. Possible reasons: Service down, invalid station IDs, or no path found.');
        }

    } catch (error) {
        console.error('❌ Client Verification Failed:', error);
    }
}

verifyL4Client();
