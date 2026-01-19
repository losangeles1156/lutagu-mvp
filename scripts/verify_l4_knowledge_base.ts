/**
 * L4 Knowledge Base Verification Script
 *
 * Verifies that all major hub stations have L4 expert knowledge coverage
 * and accessibility advice configured.
 */

import {
    RAILWAY_EXPERT_TIPS,
    HUB_STATION_TIPS,
    ACCESSIBILITY_GUIDE,
    SPECIAL_LOCATION_TIPS,
    PASS_RECOMMENDATIONS
} from '../src/lib/l4/expertKnowledgeBase';

// Major hub stations that should have L4 coverage
const MAJOR_HUB_STATIONS = [
    // JR East Major Hubs
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Akihabara',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:JR-East.Shimbashi',
    'odpt:Station:JR-East.Hamamatsucho',

    // Metro Major Hubs
    'odpt:Station:TokyoMetro.Ginza.Asakusa',
    'odpt:Station:TokyoMetro.Ginza.Ueno',
    'odpt:Station:TokyoMetro.Hibiya.Roppongi',
    'odpt:Station:TokyoMetro.Hibiya.Kamiyacho',
    'odpt:Station:TokyoMetro.Marunouchi.Otemachi',
    'odpt:Station:TokyoMetro.Tozai.Iidabashi',
    'odpt:Station:TokyoMetro.Hanzomon.Oshiage',

    // Toei Major Hubs
    'odpt:Station:Toei.Oedo.Shinjuku',
    'odpt:Station:Toei.Oedo.Roppongi',

    // Cross-operator aliases
    'odpt.Station:JR-East.Yamanote.Ueno',
    'odpt.Station:JR-East.Yamanote.Shinjuku',
    'odpt.Station:JR-East.Yamanote.Shibuya',
    'odpt.Station:TokyoMetro.Ginza.Asakusa',
    'odpt.Station:TokyoMetro.Hibiya.Roppongi',
];

// Major railway lines that should have L4 coverage
const MAJOR_RAILWAYS = [
    // Metro
    'odpt.Railway:TokyoMetro.Ginza',
    'odpt.Railway:TokyoMetro.Marunouchi',
    'odpt.Railway:TokyoMetro.Hibiya',
    'odpt.Railway:TokyoMetro.Tozai',
    'odpt.Railway:TokyoMetro.Chiyoda',
    'odpt.Railway:TokyoMetro.Yurakucho',
    'odpt.Railway:TokyoMetro.Hanzomon',
    'odpt.Railway:TokyoMetro.Namboku',
    'odpt.Railway:TokyoMetro.Fukutoshin',

    // Toei
    'odpt.Railway:Toei.Asakusa',
    'odpt.Railway:Toei.Mita',
    'odpt.Railway:Toei.Shinjuku',
    'odpt.Railway:Toei.Oedo',

    // JR
    'odpt.Railway:JR-East.Yamanote',
    'odpt.Railway:JR-East.KeihinTohoku',
    'odpt.Railway:JR-East.Chuo',
    'odpt.Railway:JR-East.Sobu',
    'odpt.Railway:JR-East.ChuoSobu',
    'odpt.Railway:JR-East.Saikyo',
    'odpt.Railway:JR-East.ShonanShinjuku',
    'odpt.Railway:JR-East.Joban',
    'odpt.Railway:JR-East.Keiyo',
];

// Special locations
const SPECIAL_LOCATIONS = [
    'Narita-Airport',
    'Haneda-Airport',
    'Tokyo-Disneyland',
    'Tokyo-Skytree',
    'Shibuya-Scramble',
];

/**
 * Check if a station ID exists in the knowledge base
 */
function hasStationTips(stationId: string): boolean {
    // Check exact match
    if (HUB_STATION_TIPS[stationId]) return true;

    // Check normalized ID
    const normalizedId = stationId.replace(/^odpt\.Station:/, 'odpt:Station:');
    if (HUB_STATION_TIPS[normalizedId]) return true;

    // Check without line prefix
    const match = stationId.match(/[.:](JR-East|Toei|TokyoMetro)[.:]([A-Za-z]+)[.:](.+)$/);
    if (match) {
        const candidates = [
            `odpt:Station:${match[1]}.${match[3]}`,
            `odpt:Station:${match[1]}.${match[2]}`
        ];
        for (const candidate of candidates) {
            if (HUB_STATION_TIPS[candidate]) return true;
        }
    }

    return false;
}

/**
 * Check if a station has accessibility guidance
 */
function hasAccessibilityAdvice(stationId: string): boolean {
    // Check exact match
    if (ACCESSIBILITY_GUIDE[stationId]) return true;

    // Check normalized ID
    const normalizedId = stationId.replace(/^odpt\.Station:/, 'odpt:Station:');
    if (ACCESSIBILITY_GUIDE[normalizedId]) return true;

    return false;
}

function verifyL4KnowledgeBase() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          L4 專家知識庫覆蓋率驗證報告                             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    let coveredHubs = 0;
    let coveredWithAccessibility = 0;

    // Check hub station coverage
    console.log('─'.repeat(60));
    console.log('【1】主要樞紐站 L4 知識覆蓋 (Hub Station Coverage)');
    console.log('─'.repeat(60));

    for (const stationId of MAJOR_HUB_STATIONS) {
        const hasTips = hasStationTips(stationId);
        const hasAccessibility = hasAccessibilityAdvice(stationId);

        const stationName = stationId.split(':').pop()?.split('.').pop() || stationId;

        const statusIcon = hasTips ? '✅' : '❌';
        const accessibilityIcon = hasAccessibility ? '♿' : '⚪';
        console.log(`   ${statusIcon} ${accessibilityIcon} ${stationName} (${hasTips ? '有' : '無'} tips)`);

        if (hasTips) coveredHubs++;
        if (hasAccessibility) coveredWithAccessibility++;
    }

    // Check railway line coverage
    console.log('\n' + '─'.repeat(60));
    console.log('【2】主要路線 L4 知識覆蓋 (Railway Line Coverage)');
    console.log('─'.repeat(60));

    let coveredRailways = 0;

    for (const railwayId of MAJOR_RAILWAYS) {
        const hasTips = RAILWAY_EXPERT_TIPS[railwayId] !== undefined;
        const railwayName = railwayId.split(':').pop()?.replace(/[.-]/g, ' ') || railwayId;

        if (hasTips) {
            coveredRailways++;
            console.log(`   ✅ ${railwayName}`);
        } else {
            console.log(`   ❌ ${railwayName}`);
        }
    }

    // Check special location coverage
    console.log('\n' + '─'.repeat(60));
    console.log('【3】特殊地點 L4 知識覆蓋 (Special Location Coverage)');
    console.log('─'.repeat(60));

    let coveredLocations = 0;

    for (const locationId of SPECIAL_LOCATIONS) {
        const hasTips = SPECIAL_LOCATION_TIPS[locationId] !== undefined;

        if (hasTips) {
            coveredLocations++;
            console.log(`   ✅ ${locationId}`);
        } else {
            console.log(`   ❌ ${locationId}`);
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('                    覆蓋率摘要 (Coverage Summary)');
    console.log('═'.repeat(60));

    console.log(`\n   📍 樞紐站覆蓋率: ${coveredHubs}/${MAJOR_HUB_STATIONS.length} (${Math.round(coveredHubs / MAJOR_HUB_STATIONS.length * 100)}%)`);
    console.log(`   ♿ 無障礙建議覆蓋: ${coveredWithAccessibility}/${MAJOR_HUB_STATIONS.length} (${Math.round(coveredWithAccessibility / MAJOR_HUB_STATIONS.length * 100)}%)`);
    console.log(`   🚃 路線知識覆蓋: ${coveredRailways}/${MAJOR_RAILWAYS.length} (${Math.round(coveredRailways / MAJOR_RAILWAYS.length * 100)}%)`);
    console.log(`   📍 特殊地點覆蓋: ${coveredLocations}/${SPECIAL_LOCATIONS.length} (${Math.round(coveredLocations / SPECIAL_LOCATIONS.length * 100)}%)`);
    console.log(`   🎫 票券建議數量: ${PASS_RECOMMENDATIONS.length}`);

    // Coverage assessment
    const hubCoverage = coveredHubs / MAJOR_HUB_STATIONS.length;
    const railwayCoverage = coveredRailways / MAJOR_RAILWAYS.length;
    const locationCoverage = coveredLocations / SPECIAL_LOCATIONS.length;
    const overallScore = (hubCoverage + railwayCoverage + locationCoverage) / 3;

    console.log(`\n   🎯 整體評分: ${Math.round(overallScore * 100)}%`);

    if (overallScore >= 0.80) {
        console.log(`   ✅ L4 專家知識庫覆蓋率良好！`);
    } else if (overallScore >= 0.60) {
        console.log(`   ⚠️  L4 專家知識庫覆蓋率中等，建議擴展。`);
    } else {
        console.log(`   ❌ L4 專家知識庫覆蓋率不足，需要擴展。`);
    }

    console.log('\n' + '═'.repeat(60) + '\n');
}

// Export for use
export { verifyL4KnowledgeBase, MAJOR_HUB_STATIONS, MAJOR_RAILWAYS, SPECIAL_LOCATIONS };

// Run if executed directly
if (require.main === module) {
    verifyL4KnowledgeBase();
    process.exit(0);
}
