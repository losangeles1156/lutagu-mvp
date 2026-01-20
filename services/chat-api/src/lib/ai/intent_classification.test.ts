import { test } from 'node:test';
import assert from 'node:assert';
import { PreDecisionEngine, DecisionLevel } from './PreDecisionEngine';

test('PreDecisionEngine Intent Classification Logic', async (t) => {
    // Note: PreDecisionEngine is a singleton export "preDecisionEngine", 
    // but the class is also exported. We can instantiate a fresh one for testing to avoid cache pollution,
    // or use the singleton. Since internal cache might affect results, a fresh instance is safer IF the class is exported.
    // Checking the file, "export class PreDecisionEngine" exists.
    const engine = new PreDecisionEngine();

    // Clear cache to ensure clean state
    engine.clearCache();

    await t.test('Priority Check: Mixed Intent (Greeting + Route)', async () => {
        // This was the bug: "你好" triggered Level 1, ignoring "去..."
        const text = "你好，我要去羽田機場";
        const result = await engine.classifyIntent(text);

        console.log(`[Test] Input: "${text}" => Level: ${result.level}, Reason: ${result.reason}`);

        // Must NOT be Level 1
        assert.notStrictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE, 'Should NOT be Level 1 (Greeting)');

        // Should be Level 2 (Route) because "去" matches LEVEL_2_KEYWORDS
        assert.ok(
            result.level === DecisionLevel.LEVEL_2_MEDIUM,
            `Should be Level 2 (Actual: ${result.level})`
        );
    });

    await t.test('Pure Intent: Route', async () => {
        const text = "我要去羽田機場";
        const result = await engine.classifyIntent(text);

        console.log(`[Test] Input: "${text}" => Level: ${result.level}, Reason: ${result.reason}`);

        assert.strictEqual(
            result.level,
            DecisionLevel.LEVEL_2_MEDIUM,
            'Should be Level 2'
        );
    });

    await t.test('Pure Intent: Greeting', async () => {
        const text = "你好";
        const result = await engine.classifyIntent(text);

        console.log(`[Test] Input: "${text}" => Level: ${result.level}, Reason: ${result.reason}`);

        assert.strictEqual(result.level, DecisionLevel.LEVEL_1_SIMPLE, 'Should be Level 1');
    });

    await t.test('Edge Case: Mixed Intent with trailing greeting', async () => {
        const text = "我要去新宿，謝謝";
        const result = await engine.classifyIntent(text);

        console.log(`[Test] Input: "${text}" => Level: ${result.level}, Reason: ${result.reason}`);

        // "去" is L2, "謝謝" is L1. L2 should take precedence.
        assert.strictEqual(
            result.level,
            DecisionLevel.LEVEL_2_MEDIUM,
            'Should be Level 2 even with trailing greeting'
        );
    });
});
