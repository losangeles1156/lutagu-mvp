/**
 * L4 Expert Knowledge Base Quality Audit Script
 *
 * Checks for:
 * - Outdated information
 * - Incorrect concepts
 * - Inconsistent data
 * - Missing references
 */

import {
    RAILWAY_EXPERT_TIPS,
    HUB_STATION_TIPS,
    ACCESSIBILITY_GUIDE,
    SPECIAL_LOCATION_TIPS,
    PASS_RECOMMENDATIONS
} from '../src/lib/l4/expertKnowledgeBase';

// Known issues to flag
const OUTDATED_PATTERNS = [
    { pattern: /2027|2028|2029/, reason: 'Future dates may be outdated' },
    { pattern: /正在施工|施工中/, reason: 'Construction status may have changed' },
    { pattern: /老爺車|古老/, reason: 'Subjective description, may be outdated' },
];

const INCORRECT_PATTERNS = [
    { pattern: /直通.*無需出站/, reason: 'Verify if transfer still requires exiting' },
    { pattern: /零距離|同月台/, reason: 'Verify if still same-platform transfer' },
    { pattern: /唯一選擇/, reason: 'May not be accurate, verify alternatives exist' },
];

const SUSPICIOUS_CATEGORIES = {
    'odpt.Railway:TokyoMetro.Namboku': 'Contains partial info about 目黑線直通',
    'odpt.Railway:TokyoMetro.Chiyoda': 'Contains 伊勢崎 which is 東武 line, not千代田',
};

interface QualityIssue {
    type: 'outdated' | 'incorrect' | 'inconsistent' | 'missing';
    category: string;
    id: string;
    issue: string;
    suggestion: string;
}

function auditKnowledgeBase(): QualityIssue[] {
    const issues: QualityIssue[] = [];

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          L4 專家知識庫品質審計報告                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Audit Railway Tips
    console.log('─'.repeat(60));
    console.log('【1】審計路線建議 (Railway Tips Audit)');
    console.log('─'.repeat(60));

    let railwayIssueCount = 0;

    for (const [railwayId, tips] of Object.entries(RAILWAY_EXPERT_TIPS)) {
        for (const tip of tips) {
            // Check for potentially outdated patterns
            for (const { pattern, reason } of OUTDATED_PATTERNS) {
                if (pattern.test(tip.text)) {
                    issues.push({
                        type: 'outdated',
                        category: 'railway',
                        id: railwayId,
                        issue: tip.text.substring(0, 50) + '...',
                        suggestion: reason
                    });
                    railwayIssueCount++;
                }
            }

            // Check for potentially incorrect patterns
            for (const { pattern, reason } of INCORRECT_PATTERNS) {
                if (pattern.test(tip.text)) {
                    issues.push({
                        type: 'incorrect',
                        category: 'railway',
                        id: railwayId,
                        issue: tip.text.substring(0, 50) + '...',
                        suggestion: reason + ' - 需要驗證'
                    });
                    railwayIssueCount++;
                }
            }
        }

        // Check for known problematic entries
        if (SUSPICIOUS_CATEGORIES[railwayId as keyof typeof SUSPICIOUS_CATEGORIES]) {
            issues.push({
                type: 'inconsistent',
                category: 'railway',
                id: railwayId,
                issue: SUSPICIOUS_CATEGORIES[railwayId as keyof typeof SUSPICIOUS_CATEGORIES],
                suggestion: '請檢查並修正此路線的資訊'
            });
            railwayIssueCount++;
        }
    }

    console.log(`   發現 ${railwayIssueCount} 個潛在問題`);

    // Audit Hub Station Tips
    console.log('\n' + '─'.repeat(60));
    console.log('【2】審計樞紐站建議 (Hub Station Tips Audit)');
    console.log('─'.repeat(60));

    let stationIssueCount = 0;

    for (const [stationId, tips] of Object.entries(HUB_STATION_TIPS)) {
        for (const tip of tips) {
            // Check for construction-related warnings that may be outdated
            if (/(施工|整修|改建)/.test(tip.text) && tip.category === 'warning') {
                issues.push({
                    type: 'outdated',
                    category: 'station',
                    id: stationId,
                    issue: tip.text.substring(0, 50) + '...',
                    suggestion: '施工狀態可能已變更，建議定期更新'
                });
                stationIssueCount++;
            }

            // Check for absolute statements that may be incorrect
            if (/(超過|所有|唯一|必須)/.test(tip.text)) {
                issues.push({
                    type: 'incorrect',
                    category: 'station',
                    id: stationId,
                    issue: tip.text.substring(0, 50) + '...',
                    suggestion: '絕對性陳述可能不完全準確'
                });
                stationIssueCount++;
            }
        }
    }

    console.log(`   發現 ${stationIssueCount} 個潛在問題`);

    // Audit Accessibility Guide
    console.log('\n' + '─'.repeat(60));
    console.log('【3】審計無障礙建議 (Accessibility Guide Audit)');
    console.log('─'.repeat(60));

    let accessibilityIssueCount = 0;

    for (const [stationId, advice] of Object.entries(ACCESSIBILITY_GUIDE)) {
        // Check for generic responses that may not be accurate
        const values = Object.values(advice).join('');
        if (values.includes('建議使用主要出口') && !values.includes('具體出口')) {
            issues.push({
                type: 'inconsistent',
                category: 'accessibility',
                id: stationId,
                issue: '建議過於籠統，缺少具體出口編號',
                suggestion: '提供具體的出口編號會更準確'
            });
            accessibilityIssueCount++;
        }
    }

    console.log(`   發現 ${accessibilityIssueCount} 個潛在問題`);

    // Audit Pass Recommendations
    console.log('\n' + '─'.repeat(60));
    console.log('【4】審計票券建議 (Pass Recommendations Audit)');
    console.log('─'.repeat(60));

    let passIssueCount = 0;

    for (const pass of PASS_RECOMMENDATIONS) {
        // Check for price information that may be outdated
        if (/¥[\d,]+/.test(pass.price)) {
            // Prices should be verified periodically
            if (!pass.price.includes('約') && !pass.price.includes('~')) {
                issues.push({
                    type: 'outdated',
                    category: 'pass',
                    id: pass.id,
                    issue: `價格 ${pass.price} 為固定值`,
                    suggestion: '票價可能變動，建議標註為參考價格'
                });
                passIssueCount++;
            }
        }
    }

    console.log(`   發現 ${passIssueCount} 個潛在問題`);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('                    審計摘要 (Audit Summary)');
    console.log('═'.repeat(60));

    const totalIssues = railwayIssueCount + stationIssueCount + accessibilityIssueCount + passIssueCount;

    console.log(`\n   🔍 總發現問題數: ${totalIssues}`);
    console.log(`   ⚠️  路線建議問題: ${railwayIssueCount}`);
    console.log(`   ⚠️  站點建議問題: ${stationIssueCount}`);
    console.log(`   ⚠️  無障礙建議問題: ${accessibilityIssueCount}`);
    console.log(`   ⚠️  票券建議問題: ${passIssueCount}`);

    if (totalIssues > 0) {
        console.log(`\n   📋 需要審核的項目:\n`);

        // Show sample issues
        const sampleIssues = issues.slice(0, 10);
        for (const issue of sampleIssues) {
            console.log(`   [${issue.type.toUpperCase()}] ${issue.id}`);
            console.log(`      ${issue.issue}`);
            console.log(`      → ${issue.suggestion}\n`);
        }

        if (issues.length > 10) {
            console.log(`   ... 還有 ${issues.length - 10} 個問題需要審核`);
        }
    }

    // Recommendations
    console.log('\n' + '─'.repeat(60));
    console.log('【5】品質改進建議 (Quality Improvement Recommendations)');
    console.log('─'.repeat(60));

    console.log(`
   1. 定期更新施工狀態：施工相關資訊應每季審核

   2. 驗證轉乘資訊：直通/轉乘資訊可能因運營變更而改變

   3. 更新票券價格：參考官方網站定期更新票價資訊

   4. 增加數據來源標註：標註資訊更新日期與來源

   5. 避免絕對性陳述：使用「建議」「通常」等詞彙替代絕對性描述
    `);

    console.log('═'.repeat(60) + '\n');

    return issues;
}

// Run audit if executed directly
if (require.main === module) {
    auditKnowledgeBase();
    process.exit(0);
}

export { auditKnowledgeBase, QualityIssue };
