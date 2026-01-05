
import { WEATHER_REGION_POLICY } from '../src/lib/weather/policy';

const TEST_CASES = [
    // === 跨區域污染測試 ===
    {
        id: '1_positive_standard',
        title: '気象警報・注意報（東京都）',
        summary: '東京地方、伊豆諸島北部、伊豆諸島南部では、強風に注意してください。東京地方では、空気の乾燥した状態が続くため、火の取り扱いに注意してください。',
        expected: true,
        desc: '標準東京警報（含乾燥注意）'
    },
    {
        id: '2_negative_island_only',
        title: '気象警報・注意報（伊豆諸島）',
        summary: '伊豆諸島北部では、高波に警戒してください。',
        expected: false,
        desc: '僅離島標題，應過濾'
    },
    {
        id: '3_negative_cross_contamination_FIXED',
        title: '気象警報・注意報',
        summary: '東京地方は晴れています。伊豆諸島南部では、大雨警報が出ています。',
        expected: false,
        desc: '東京晴天（無警報），離島大雨警報 - 應過濾（修復後）'
    },
    {
        id: '4_positive_mixed',
        title: '気象警報・注意報',
        summary: '東京地方と伊豆諸島では、大雨に警戒してください。',
        expected: true,
        desc: '東京和離島都有警報，應通過'
    },
    {
        id: '5_negative_emergency_island',
        title: '震度速報',
        summary: '１日１２時３４分ころ、地震がありました。\n震源地は、父島近海\n震度３：小笠原諸島',
        expected: false,
        desc: '離島地震，應過濾'
    },
    {
        id: '6_positive_emergency_tokyo',
        title: '震度速報',
        summary: '１日１２時３４分ころ、地震がありました。\n震度３：東京地方２３区',
        expected: true,
        desc: '東京地震，應通過'
    },
    // === 晴朗天氣測試 ===
    {
        id: '7_negative_clear_tokyo',
        title: '気象警報・注意報',
        summary: '東京地方は晴れています。',
        expected: false,
        desc: '東京晴朗無警報，應過濾'
    },
    // === 警報解除測試 ===
    {
        id: '8_negative_lifted',
        title: '気象警報・注意報',
        summary: '東京地方の警報は解除されました。',
        expected: false,
        desc: '警報已解除，應過濾'
    }
];

function runRegionPolicyTests() {
    console.log('🧪 Verifying Weather Region Policy (Fixed)...\n');
    let failures = 0;

    TEST_CASES.forEach(test => {
        const result = WEATHER_REGION_POLICY.isTargetRegion(test.title, test.summary);
        const passed = result === test.expected;

        console.log(`[${passed ? '✅' : '❌'}] ${test.desc}`);
        console.log(`   標題: ${test.title}`);
        console.log(`   摘要: ${test.summary.substring(0, 60)}...`);
        console.log(`   預期: ${test.expected} | 實際: ${result}`);

        if (!passed) {
            failures++;
            console.log('   🔴 FAILED - 需要調查');
        }
        console.log('');
    });

    return failures;
}

function runSeverityTests() {
    console.log('\n🧪 Verifying Severity Classification...\n');
    
    const severityTests = [
        { title: '気象特別警報報', expected: 'critical' },
        { title: '大雨警報（浸水害）', expected: 'warning' },
        { title: '大雪警報', expected: 'warning' },
        { title: '強風警報', expected: 'warning' },
        { title: '波浪警報', expected: 'warning' },
        { title: '高潮警報', expected: 'warning' },
        { title: '土砂災害警戒情報', expected: 'warning' }, // 土砂災害警戒為 warning 等級
        { title: '乾燥注意報', expected: 'advisory' },
        { title: '強風注意報', expected: 'advisory' },
        { title: '大雨注意報', expected: 'advisory' },
        { title: '気象情報', expected: 'info' },
        { title: '全般台風情報', expected: 'info' }
    ];

    let passed = 0;
    let failed = 0;

    severityTests.forEach(test => {
        const result = WEATHER_REGION_POLICY.getSeverity(test.title, '');
        const isPass = result === test.expected;
        if (isPass) passed++; else failed++;

        console.log(`[${isPass ? '✅' : '❌'}] "${test.title}" -> ${result} (預期: ${test.expected})`);
    });

    console.log(`\nSeverity Tests: ${passed}/${severityTests.length} Passed`);
    return failed;
}

function runUserProfileTests() {
    console.log('\n🧪 Verifying User Profile Adjustments...\n');
    
    const profileTests = [
        { severity: 'advisory' as const, profile: 'wheelchair', expected: 'warning' },
        { severity: 'info' as const, profile: 'wheelchair', expected: 'advisory' },
        { severity: 'info' as const, profile: 'stroller', expected: 'advisory' },
        { severity: 'advisory' as const, profile: 'general', expected: 'advisory' }
    ];

    let passed = 0;
    let failed = 0;

    profileTests.forEach(test => {
        const result = WEATHER_REGION_POLICY.adjustSeverityForUser(test.severity, test.profile as any);
        const isPass = result === test.expected;
        if (isPass) passed++; else failed++;

        console.log(`[${isPass ? '✅' : '❌'}] ${test.profile} + ${test.severity} -> ${result} (預期: ${test.expected})`);
    });

    console.log(`\nProfile Tests: ${passed}/${profileTests.length} Passed`);
    return failed;
}

// Run all tests
const regionFailures = runRegionPolicyTests();
const severityFailures = runSeverityTests();
const profileFailures = runUserProfileTests();

const totalFailures = regionFailures + severityFailures + profileFailures;

console.log('\n=== 測試結果摘要 ===');
if (totalFailures === 0) {
    console.log('✨ 所有測試通過！天氣警報機制修復完成。');
} else {
    console.log(`⚠️ ${totalFailures} 個測試失敗。需要進一步修復。`);
    process.exit(1);
}
