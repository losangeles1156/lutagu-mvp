
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { executeTool } from '../src/lib/agent/tools';
import { TagContext } from '../src/lib/tagging/TagEngine';

async function testHatsumodeScenario() {
    console.log('--- Testing Hatsumode Scenario ---');

    // 1. Get Current Time
    console.log('\n[Step 1] Fetching Current Time (Japan)...');
    const timeResult = await executeTool('get_current_time', {});

    if (!timeResult.success || !timeResult.data) {
        console.error('Failed to get time:', timeResult.error);
        return;
    }

    const timeData = timeResult.data;
    console.log(`Current Time (JST): ${timeData.local}`);
    console.log(`ISO: ${timeData.iso}`);
    console.log(`Is Holiday? ${timeData.isHoliday}`);

    if (timeData.month === 1 && timeData.day <= 3) {
        console.log('✅ Correctly identified New Year period (Jan 1-3).');
    } else {
        console.warn('⚠️ Note: Test running outside New Year period. Will manually inject Jan 1st for positive test.');
    }

    // 2. Simulate User Query: "Hatsumode info"
    // Scenario A: Real Date (or Forced Jan 1st if today isn't)
    console.log('\n[Step 2] Searching Knowledge with Jan 1st Context...');

    // Force Jan 1st for consistent testing regardless of when this script runs in future
    const jan1stDate = '2026-01-01T10:00:00.000Z';

    const contextA: TagContext = {
        userProfile: 'general',
        weather: 'clear',
        timeOfDay: 'day',
        dateISO: jan1stDate
    };

    const searchResultA = await executeTool('search_knowledge', {
        stationId: 'odpt:Station:JR-East.Tokyo', // Tokyo Station
        query: 'shrine hatsumode',
        context: contextA
    });

    if (searchResultA.success && searchResultA.data) {
        const hatsumodeEntry = searchResultA.data.find(e => e.id === 'hatsumode-general-warning');
        if (hatsumodeEntry) {
            console.log('✅ FOUND Hatsumode Warning!');
            console.log(`Title: ${hatsumodeEntry.title}`);
            console.log(`Score: ${hatsumodeEntry.score} (Expected high score due to seasonal boost)`);
        } else {
            console.error('❌ FAILED: Hatsumode warning not found in results.');
            console.log('Results:', JSON.stringify(searchResultA.data, null, 2));
        }
    } else {
        console.error('Search failed:', searchResultA.error);
    }

    // Scenario B: Off-Season Date (July 1st)
    console.log('\n[Step 3] Negative Test: Searching with July 1st Context...');
    const july1stDate = '2026-07-01T10:00:00.000Z';

    const contextB: TagContext = {
        userProfile: 'general',
        weather: 'clear',
        timeOfDay: 'day',
        dateISO: july1stDate
    };

    const searchResultB = await executeTool('search_knowledge', {
        stationId: 'odpt:Station:JR-East.Tokyo',
        query: 'shrine hatsumode',
        context: contextB
    });

    if (searchResultB.success && searchResultB.data) {
        const hatsumodeEntry = searchResultB.data.find(e => e.id === 'hatsumode-general-warning');
        if (!hatsumodeEntry) {
            console.log('✅ PASSED: Hatsumode warning correctly filtered out for July date.');
        } else {
            console.error('❌ FAILED: Hatsumode warning appeared in July! Logic error.');
            console.log(`Score: ${hatsumodeEntry.score}`);
        }
    }

    console.log('\n--- Test Complete ---');
}

testHatsumodeScenario();
