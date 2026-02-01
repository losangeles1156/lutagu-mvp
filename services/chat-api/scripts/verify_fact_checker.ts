
import { checkForHallucinations } from '../src/lib/validation/FactChecker';

const testCases = [
    {
        name: 'Hallucination: Haneda to Tokyo Direct (Keikyu)',
        query: '我要從羽田機場去東京車站',
        response: '您可以搭乘京急線直達東京車站，非常方便。',
        expectHallucination: true,
        expectedCorrectionPart: '需要轉乘'
    },
    {
        name: 'Hallucination: No Transfer Claim',
        query: '羽田到東京車站需要轉車嗎',
        response: '不需要轉車，有直達的電車。',
        expectHallucination: true,
        expectedCorrectionPart: '必須轉乘'
    },
    {
        name: 'Valid: Factually Correct Transfer',
        query: '羽田機場去東京車站怎麼走',
        response: '您可以搭乘京急線到品川站，然後轉乘 JR 山手線或是京濱東北線到達東京車站。',
        expectHallucination: false
    },
    {
        name: 'Valid: Unrelated Query (Tokyo Tower)',
        query: '東京塔在哪裡',
        response: '東京塔位於港區芝公園，可以搭地鐵到赤羽橋站。',
        expectHallucination: false
    },
    {
        name: 'Hallucination: Generic Direct Claim',
        query: '羽田去東京車站',
        response: '這一路直達，不用擔心中途下車。',
        expectHallucination: true,
        expectedCorrectionPart: '需要轉乘'
    }
];

console.log('=== Starting FactChecker Verification ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Response: "${test.response}"`);

    const result = checkForHallucinations(test.response, test.query);

    let isSuccess = true;
    let failureReason = '';

    // Check Detection
    if (result.hasHallucination !== test.expectHallucination) {
        isSuccess = false;
        failureReason += `Expected hasHallucination=${test.expectHallucination}, got ${result.hasHallucination}. `;
    }

    // Check Correction content if expected
    if (test.expectHallucination && test.expectedCorrectionPart) {
        if (!result.correctedResponse?.includes(test.expectedCorrectionPart)) {
            isSuccess = false;
            failureReason += `Expected correction to contain "${test.expectedCorrectionPart}". Got: ${result.correctedResponse?.slice(-50)}...`;
        }
    }

    if (isSuccess) {
        console.log('✅ PASS');
        passed++;
    } else {
        console.log('❌ FAIL');
        console.log(`   Reason: ${failureReason}`);
        failed++;
    }
    console.log('----------------------------------------');
});

console.log(`\n=== Summary ===`);
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) process.exit(1);
