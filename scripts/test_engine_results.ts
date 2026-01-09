
import { findRankedRoutes, RailwayTopology } from '../src/lib/l4/assistantEngine';
import CORE_TOPOLOGY from '../src/lib/l4/generated/coreTopology.json';

async function testEngine() {
    const fromIds = ['odpt.Station:JR-East.Yamanote.Shinjuku'];
    const toIds = ['odpt.Station:JR-East.Yamanote.Tokyo'];
    const railways = CORE_TOPOLOGY as unknown as RailwayTopology[];

    const results = findRankedRoutes({
        originStationId: fromIds,
        destinationStationId: toIds,
        railways,
        maxHops: 35,
        locale: 'zh-TW'
    });

    console.log(`Found ${results.length} routes.`);
    results.forEach((r, i) => {
        console.log(`\nRoute ${i + 1}: ${r.label}`);
        console.log(`Fare: IC ${r.fare?.ic}, Ticket ${r.fare?.ticket}`);
        console.log(`Duration: ${r.duration} min`);
        console.log(`Transfers: ${r.transfers}`);
        console.log('Steps:');
        r.steps.forEach(s => console.log(`  - ${s.icon} ${s.text}`));
    });
}

testEngine();
