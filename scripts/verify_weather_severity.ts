
import { WEATHER_REGION_POLICY } from '../src/lib/weather/policy';

console.log('=== WEATHER SEVERITY VERIFICATION ===');

const testCases = [
    {
        title: '気象特別警報報（東京都）', // Special Warning (Red) - CRITICAL
        expected: 'critical',
        desc: '特別警報應為 critical'
    },
    {
        title: '大雨警報（浸水害）', // Regular Warning (Orange) - WARNING
        expected: 'warning',
        desc: '一般警報應為 warning'
    },
    {
        title: '乾燥注意報', // Advisory (Yellow) - ADVISORY
        expected: 'advisory',
        desc: '注意報應為 advisory'
    },
    {
        title: '強風注意報', // Advisory (Yellow) - ADVISORY (FIXED!)
        expected: 'advisory',
        desc: '強風注意報修復後應為 advisory（黃色）'
    },
    {
        title: '強風警報', // Warning (Orange) - WARNING
        expected: 'warning',
        desc: '強風警報應為 warning'
    },
    {
        title: '気象情報', // General Info (Blue) - INFO
        expected: 'info',
        desc: '氣象資訊應為 info'
    },
    {
        title: '震度速報', // Earthquake - INFO (地震速報是 info 等級)
        expected: 'info',
        desc: '震度速報為 info 等級'
    }
];

let passed = 0;
let failed = 0;

for (const t of testCases) {
    const result = WEATHER_REGION_POLICY.getSeverity(t.title, '');
    const isPass = result === t.expected;
    if (isPass) passed++; else failed++;

    console.log(`[${isPass ? 'PASS' : 'FAIL'}] "${t.title}" -> ${result} (Expected: ${t.expected})`);
    if (!isPass) {
        console.log(`   └─ ${t.desc}`);
    }
}

console.log(`\nResult: ${passed}/${testCases.length} Passed.`);
if (failed > 0) {
    console.log(`\n⚠️ 備註：weather policy 的分級設計如下：`);
    console.log(`   - Critical: 僅特別警報（特別警報、大地震等）`);
    console.log(`   - Warning: 一般警報（大雨警報、強風警報等）`);
    console.log(`   - Advisory: 注意報（強風注意報、大雨注意報等）`);
    console.log(`   - Info: 氣象資訊`);
}
