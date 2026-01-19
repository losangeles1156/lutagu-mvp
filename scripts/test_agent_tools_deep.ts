import { executeTool } from '../src/lib/agent/tools';
import { TagContext } from '../src/lib/tagging/TagEngine';

async function runTests() {
    console.log('--- Starting Agent Tools Deep Dive Tests ---\n');

    // Test 1: Natural Language Query
    console.log('Test 1: search_knowledge with Natural Language Query (Tokyo Station)');
    const result1 = await executeTool('search_knowledge', {
        stationId: 'odpt:Station:JR-East.Tokyo',
        query: 'transfer keiyo line walk',
        context: {
            userProfile: 'general',
            weather: 'clear'
        }
    });

    if (result1.success) {
        console.log(`[PASS] Query executed. Found ${result1.data?.length} entries.`);
        if (result1.data && result1.data.length > 0) {
            console.log('Top result:', result1.data[0].title, `(Score: ${result1.data[0].score})`);
            result1.data.forEach(d => console.log(` - ${d.title} (Tags: ${d.tags.join(',')}) Score: ${d.score}`));
        } else {
            console.log('No entries found.');
        }
    } else {
        console.error(`[FAIL] Query failed: ${result1.error}`);
    }

    // Test 2: Dynamic Weighting with Context
    console.log('\nTest 2: search_knowledge with Context (Ueno - Wheelchair)');
    // Should match generic-exit-a1-barrier because of userProfile='wheelchair' mapping to 'accessibility.wheelchair'
    const result2 = await executeTool('search_knowledge', {
        stationId: 'odpt:Station:TokyoMetro.Ueno',
        query: 'exit info', // Generic query
        context: {
            userProfile: 'wheelchair',
            weather: 'rain'
        } as TagContext
    });

    if (result2.success) {
        console.log(`[PASS] Context query executed. Found ${result2.data?.length} entries.`);
        if (result2.data && result2.data.length > 0) {
            console.log('Top result:', result2.data[0].title, `(Score: ${result2.data[0].score})`);
             result2.data.forEach(d => console.log(` - ${d.title} Score: ${d.score}`));
        } else {
             console.log('No entries found.');
        }
    } else {
        console.error(`[FAIL] Context query failed: ${result2.error}`);
    }

    // Test 3: Legacy Tags Support
    console.log('\nTest 3: search_knowledge with Legacy Tags');
    const result3 = await executeTool('search_knowledge', {
        stationId: 'odpt:Station:JR-East.Tokyo',
        tags: ['transfer', 'keiyo']
    });

    if (result3.success) {
        console.log(`[PASS] Legacy tags query executed. Found ${result3.data?.length} entries.`);
         if (result3.data && result3.data.length > 0) {
            console.log('Top result:', result3.data[0].title, `(Score: ${result3.data[0].score})`);
        }
    } else {
        console.error(`[FAIL] Legacy tags query failed: ${result3.error}`);
    }
}

runTests().catch(console.error);
