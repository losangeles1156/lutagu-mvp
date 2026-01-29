import { describe, it } from 'node:test';
import assert from 'node:assert';
import { feedbackStore } from './FeedbackStore';
import { weightAdjuster } from './WeightAdjuster';

describe('FeedbackStore Integration', () => {
    it('should update userFeedback in logs', () => {
        const text = 'Test Request';
        feedbackStore.logRequest({
            text,
            source: 'llm',
            timestamp: Date.now()
        });

        feedbackStore.recordUserFeedback(text, 'positive');

        const log = feedbackStore.getLogs().find(l => l.text === text);
        assert.strictEqual(log?.userFeedback, 'positive');
    });

    it('should adjust weights when contextNodeId provided', async () => {
        const nodeId = 'odpt:Station:IntegrationTest';

        // 1. Get Baseline
        const w1 = await weightAdjuster.getWeights(nodeId);

        // 2. Record Positive Feedback (Stateless Mode)
        // Note: recordUserFeedback is sync but processSignal is async. 
        // We wait a bit or use internal knowledge that processSignal awaits nothing blocking?
        // processSignal is async. recordUserFeedback fires and forgets.
        // We need to wait for the promise loop to potentially clear? 
        // Actually, without await, we can't guarantee execution order in test.
        // But since it's in-memory, it should be fast.

        feedbackStore.recordUserFeedback('Stateless', 'positive', nodeId);

        // Hack: processSignal has no delay, so it enters microtask queue.
        // await null to yield event loop.
        await new Promise(r => setTimeout(r, 50));

        // 3. Verify Boost
        const w2 = await weightAdjuster.getWeights(nodeId);

        // Default is 1.0. Boost is * 1.05.
        // Expect w2.stay > 1.0 (Note: getWeights returns {click, stay})
        assert.ok(w2.stay > 1.0, `Stay Weight should increase (Got ${w2.stay})`);
    });
});
