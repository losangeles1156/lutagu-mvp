/**
 * PreDecisionEngine 單元測試
 *
 * 測試內容：
 * 1. Level 1 關鍵詞匹配
 * 2. Level 2 關鍵詞匹配
 * 3. 快取機制
 * 4. 邊界條件
 * 5. 效能測試
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// Import test subject
// ============================================================================

import {
    DecisionLevel,
    classifyIntent,
    clearPreDecisionCache,
    getPreDecisionCacheStats
} from './PreDecisionEngine';

// ============================================================================
// Test Suite
// ============================================================================

describe('PreDecisionEngine', () => {
    beforeEach(() => {
        clearPreDecisionCache();
    });

    afterEach(() => {
        clearPreDecisionCache();
    });

    // ========================================================================
    // Level 1 Tests
    // ========================================================================

    describe('Level 1 - Keyword Matching', async () => {
        const greetings = ['你好', 'hello', 'hi', '早安', '謝謝', '再見', '阿里嘎多', '好', 'ok'];

        for (const greeting of greetings) {
            it(`should match greeting: "${greeting}"`, async () => {
                const result = await classifyIntent(greeting);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
                assert.strictEqual(result.suggestedModel, 'none');
                assert.ok(result.confidence >= 0.9, `Confidence should be >= 0.9, got ${result.confidence}`);
            });
        }

        const basicInfo = ['天氣', '現在幾點', '匯率', '今天日期', '星期幾'];
        for (const phrase of basicInfo) {
            it(`should match basic info: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
            });
        }

        const faq = ['怎麼買票', 'IC卡', '哪裡買', '營業時間', 'suica', 'pasmo', '定期券', '充值'];
        for (const phrase of faq) {
            it(`should match simple FAQ: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
            });
        }

        // 新增的肯定/否定回應測試
        const affirmative = ['好', '可以', '沒問題', '不用'];
        for (const word of affirmative) {
            it(`should match affirmative: "${word}"`, async () => {
                const result = await classifyIntent(word);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
            });
        }
    });

    // ========================================================================
    // Level 2 Tests
    // ========================================================================

    describe('Level 2 - Keyword Matching', async () => {
        // 基本路線規劃關鍵詞
        const routes = ['怎麼去', '從東京到大阪', '路線規劃', '轉乘', '換車', '搭乘', '坐車'];
        for (const phrase of routes) {
            it(`should match route: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
                assert.strictEqual(result.suggestedModel, 'algorithm');
            });
        }

        // 票價相關關鍵詞
        const fares = ['多少錢', '票價', '車資', '費用', '多少円', '總共'];
        for (const phrase of fares) {
            it(`should match fare: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
            });
        }

        // 時間表相關關鍵詞
        const timetables = ['時刻表', '首班車', '末班車', '發車時間', '等候時間', '多久'];
        for (const phrase of timetables) {
            it(`should match timetable: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
            });
        }

        // 站點設施關鍵詞
        const stationInfo = ['電梯', '電扶梯', '出口', '月台', '剪票口', '寄物櫃', '洗手間'];
        for (const phrase of stationInfo) {
            it(`should match station info: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
            });
        }

        // 附近設施關鍵詞
        const nearby = ['附近有什麼', '推薦景點', '附近推薦', '美食', '購物'];
        for (const phrase of nearby) {
            it(`should match nearby: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
            });
        }

        // 營運狀態關鍵詞
        const operation = ['營運', '運行', '延誤', '誤點', '停駛'];
        for (const phrase of operation) {
            it(`should match operation status: "${phrase}"`, async () => {
                const result = await classifyIntent(phrase);
                assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
            });
        }

        it('should match "現在幾點" as Level 1 (basic info)', async () => {
            const result = await classifyIntent('現在幾點');
            assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
        });
    });

    // ========================================================================
    // Cache Tests
    // ========================================================================

    describe('Cache Mechanism', async () => {
        it('should cache results', async () => {
            const result1 = await classifyIntent('你好');
            const result2 = await classifyIntent('你好');

            assert.strictEqual(result1._fromCache, undefined);
            assert.strictEqual(result2._fromCache, true);
        });

        it('should clear cache correctly', async () => {
            await classifyIntent('你好');
            clearPreDecisionCache();

            const result = await classifyIntent('你好');
            assert.strictEqual(result._fromCache, undefined);
        });

        it('should report cache stats', () => {
            const stats = getPreDecisionCacheStats();
            assert.ok('size' in stats);
            assert.ok('maxSize' in stats);
            assert.ok('ttlMs' in stats);
            assert.strictEqual(stats.maxSize, 500);
            assert.strictEqual(stats.ttlMs, 300000);
        });
    });

    // ========================================================================
    // Edge Cases Tests
    // ========================================================================

    describe('Edge Cases', async () => {
        it('should handle empty string', async () => {
            const result = await classifyIntent('');
            assert.ok(result !== null);
        });

        it('should handle whitespace only', async () => {
            const result = await classifyIntent('   ');
            assert.ok(result !== null);
        });

        it('should handle very long input', async () => {
            const longInput = '帮我规划一个从东京到京都的一日游路线，要经过大阪和神户，我想去参观清水寺、金阁寺，还有大阪城，晚上想吃烤肉'; // 不包含 "幾點"
            const result = await classifyIntent(longInput);
            assert.ok(result !== null);
            // 複雜查詢應該被分類為 Level 3
            assert.ok(
                result.level === DecisionLevel.LEVEL_3_COMPLEX ||
                result.level === DecisionLevel.LEVEL_2_MEDIUM,
                `Expected complex or medium, got ${result.level}`
            );
        });

        it('should handle mixed language input', async () => {
            const result = await classifyIntent('從東京到大阪怎麼去？How much is the fare?');
            assert.ok(result !== null);
        });
    });

    // ========================================================================
    // Priority Tests
    // ========================================================================

    describe('Priority - Level 1 > Level 2 > Level 3', async () => {
        it('should prioritize Level 1 over Level 2', async () => {
            const result = await classifyIntent('謝謝');
            assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE);
        });

        it('should prioritize Level 2 over going directly to ML', async () => {
            const result = await classifyIntent('到東京多少錢');
            assert.strictEqual(result.level, DecisionLevel.LEVEL_2_MEDIUM);
        });
    });

    // ========================================================================
    // Performance Tests
    // ========================================================================

    describe('Performance', async () => {
        it('should classify Level 1 keywords in < 5ms', async () => {
            const start = Date.now();
            await classifyIntent('你好');
            const elapsed = Date.now() - start;

            assert.ok(elapsed < 5, `Expected < 5ms, got ${elapsed}ms`);
        });

        it('should classify Level 2 keywords in < 20ms', async () => {
            const start = Date.now();
            await classifyIntent('怎麼去東京');
            const elapsed = Date.now() - start;

            assert.ok(elapsed < 20, `Expected < 20ms, got ${elapsed}ms`);
        });

        it('should be faster with cache hit', async () => {
            // First call
            await classifyIntent('謝謝');

            // Second call (cached) - should be at least as fast
            const start2 = Date.now();
            await classifyIntent('謝謝');
            const time2 = Date.now() - start2;

            // Cached call should be very fast (< 1ms)
            assert.ok(time2 <= 1, `Cache hit should be <= 1ms, got ${time2}ms`);
        });
    });

    // ========================================================================
    // Decision Result Validation
    // ========================================================================

    describe('Decision Result Structure', async () => {
        it('should have all required fields', async () => {
            const result = await classifyIntent('你好');

            assert.ok('level' in result, 'Should have level field');
            assert.ok('confidence' in result, 'Should have confidence field');
            assert.ok('suggestedModel' in result, 'Should have suggestedModel field');
            assert.ok('reason' in result, 'Should have reason field');
            assert.ok('estimatedLatency' in result, 'Should have estimatedLatency field');
        });

        it('should have valid confidence range (0-1)', async () => {
            const testInputs = ['你好', '怎麼去', '幫我規劃'];

            for (const input of testInputs) {
                const result = await classifyIntent(input);
                assert.ok(result.confidence >= 0, `Confidence should be >= 0, got ${result.confidence}`);
                assert.ok(result.confidence <= 1, `Confidence should be <= 1, got ${result.confidence}`);
            }
        });
    });
});
