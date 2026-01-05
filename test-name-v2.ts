import { findStationIdsByName } from './src/lib/l4/assistantEngine';

const testNames = [
    '蔵前', 
    '藏前', 
    '大江戶線藏前', 
    '都營大江戶線新宿', 
    'JR東京站', 
    '東京地下鐵銀座站',
    '澀谷',
    '涩谷'
];

testNames.forEach(name => {
    const ids = findStationIdsByName(name);
    console.log(`Input: [${name}] -> Found IDs: ${ids.length} (${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''})`);
});
