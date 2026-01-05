
import { findRankedRoutes, type RailwayTopology } from './src/lib/l4/assistantEngine';
import CORE_TOPOLOGY from './src/lib/l4/generated/coreTopology.json';

const railways = CORE_TOPOLOGY as unknown as RailwayTopology[];

const testRoutes = [
    { from: 'odpt.Station:JR-East.Yamanote.Shinjuku', to: 'odpt.Station:JR-East.Yamanote.Tokyo' },
    { from: 'odpt.Station:JR-East.Yamanote.Shinjuku', to: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' },
    { from: 'odpt.Station:TokyoMetro.Ginza.Shibuya', to: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
    { from: 'odpt.Station:JR-East.Yamanote.Shibuya', to: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
];

testRoutes.forEach(route => {
    const results = findRankedRoutes({
        originStationId: route.from,
        destinationStationId: route.to,
        railways,
        maxHops: 50,
        locale: 'zh-TW'
    });
    console.log(`Route from ${route.from} to ${route.to}: ${results.length} options found`);
    if (results.length > 0) {
        console.log(`  First option: ${results[0].label}, transfers: ${results[0].transfers}`);
    } else {
        console.log(`  FAILED to find route`);
    }
});
