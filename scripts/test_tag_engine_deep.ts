
import { TagEngine, Tag, TagContext } from '../src/lib/tagging/TagEngine';

async function runTests() {
    console.log('--- Starting Tag Engine Deep Dive Tests ---\n');
    let passed = 0;
    let total = 0;

    // --- Test 1: Query Parsing (Multi-dimensional) ---
    total++;
    console.log('Test 1: Query Parsing (Multi-dimensional)');
    const query = "Find a quiet cafe with wifi";
    const parsedTags = TagEngine.parseQuery(query);
    const tagNames = parsedTags.map(t => t.name).sort();

    if (tagNames.includes('quiet') && tagNames.includes('cafe') && tagNames.includes('wifi')) {
        console.log(`[PASS] Parsed "${query}" -> ${tagNames.join(', ')}`);
        passed++;
    } else {
        console.error(`[FAIL] Parsing failed. Got: ${tagNames.join(', ')}`);
    }

    // --- Test 2: Synonym Matching ---
    total++;
    console.log('\nTest 2: Synonym Matching');
    const querySyn = "accessible lift and starbucks";
    const parsedSyn = TagEngine.parseQuery(querySyn);
    const synNames = parsedSyn.map(t => t.name).sort();

    // accessible -> elevator (via synonym), lift -> elevator (via synonym), starbucks -> cafe (via synonym)
    if (synNames.includes('elevator') && synNames.includes('cafe')) {
        console.log(`[PASS] Parsed "${querySyn}" -> ${synNames.join(', ')}`);
        passed++;
    } else {
        console.error(`[FAIL] Synonym matching failed. Got: ${synNames.join(', ')}`);
    }

    // --- Test 3: Dynamic Weighting (Profile) ---
    total++;
    console.log('\nTest 3: Dynamic Weighting (Profile)');
    const elevatorTag: Tag = { id: 't1', name: 'elevator', category: 'facility', baseWeight: 0.8 };

    const contextGeneral: TagContext = { userProfile: 'general', weather: 'clear' };
    const contextWheelchair: TagContext = { userProfile: 'wheelchair', weather: 'clear' };

    const wGeneral = TagEngine.calculateContextualWeight(elevatorTag, contextGeneral);
    const wWheelchair = TagEngine.calculateContextualWeight(elevatorTag, contextWheelchair);

    console.log(`Weight (General): ${wGeneral}`);
    console.log(`Weight (Wheelchair): ${wWheelchair}`);

    if (wWheelchair > wGeneral && wWheelchair >= 1.6) { // 0.8 * 2.0 = 1.6
        console.log(`[PASS] Wheelchair profile correctly boosted elevator weight.`);
        passed++;
    } else {
        console.error(`[FAIL] Weighting logic incorrect.`);
    }

    // --- Test 4: Dynamic Weighting (Weather) ---
    total++;
    console.log('\nTest 4: Dynamic Weighting (Weather)');
    const parkTag: Tag = { id: 't6', name: 'park', category: 'outdoor', baseWeight: 0.5 };

    const contextRain: TagContext = { userProfile: 'general', weather: 'rain' };
    const wRain = TagEngine.calculateContextualWeight(parkTag, contextRain);

    console.log(`Weight (Park in Rain): ${wRain}`);

    if (wRain < 0.5) { // 0.5 * 0.2 = 0.1
        console.log(`[PASS] Rain correctly penalized outdoor park.`);
        passed++;
    } else {
        console.error(`[FAIL] Weather weighting logic incorrect.`);
    }

    // --- Test 5: Cosine Similarity ---
    total++;
    console.log('\nTest 5: Cosine Similarity');
    const vecTagA: Tag = { id: 'v1', name: 'A', category: 'test', vector: [1, 0, 0] };
    const vecTagB: Tag = { id: 'v2', name: 'B', category: 'test', vector: [0.9, 0.1, 0] }; // Close to A
    const vecTagC: Tag = { id: 'v3', name: 'C', category: 'test', vector: [0, 1, 0] };   // Orthogonal to A

    const simAB = TagEngine.calculateSimilarity(vecTagA, vecTagB);
    const simAC = TagEngine.calculateSimilarity(vecTagA, vecTagC);

    console.log(`Sim(A, B): ${simAB.toFixed(4)}`);
    console.log(`Sim(A, C): ${simAC.toFixed(4)}`);

    if (simAB > 0.9 && simAC === 0) {
        console.log(`[PASS] Cosine similarity calculation correct.`);
        passed++;
    } else {
        console.error(`[FAIL] Cosine similarity calculation incorrect.`);
    }

    console.log(`\n--- Summary: ${passed}/${total} Tests Passed ---`);
}

runTests().catch(console.error);
