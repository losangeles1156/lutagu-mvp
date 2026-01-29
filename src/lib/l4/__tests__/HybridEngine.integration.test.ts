
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HybridEngine, HybridResponse } from '../HybridEngine'; // Import Class
import { skillRegistry, SkillResult, DeepResearchSkill } from '../skills/SkillRegistry';
import { RequestContext } from '../HybridEngine';

// Mock Skill for Integration
class IntegrationTestSkill implements DeepResearchSkill {
    name = "IntegrationSkill";
    priority = 100;
    definition = {
        name: "IntegrationSkill",
        description: "E2E Test",
        parameters: { type: "object" as const, properties: { param: { type: "string" } } }
    };
    gemCapabilities = ['TEST_CAP'];

    canHandle(input: string) { return input.includes('test_integration'); }
    calculateRelevance() { return 1.0; }
    async execute(input: string, context: RequestContext, params: any): Promise<SkillResult | null> {
        return {
            source: 'knowledge' as const,
            type: 'text' as const,
            content: `Integration Success: ${context.currentStation}`,
            data: { params },
            confidence: 1.0,
            reasoning: 'E2E Test'
        };
    }
}

describe('HybridEngine Integration', () => {

    // Register mock skill
    skillRegistry.register(new IntegrationTestSkill());
    const engine = new HybridEngine(); // Instantiate

    it('should orchestrate full flow: Resolve Node -> Dispatch -> Execute', async () => {

        // Use processRequest
        const response = await engine.processRequest({
            text: "test_integration at Ueno",
            locale: 'zh-TW',
            context: {
                currentStation: "odpt.Station:JR-East.Yamanote.Tokyo"
            }
        });

        assert.ok(response, 'Response should not be null');
        assert.ok(response.content.includes('Integration Success'), 'Skill execution failed');
        assert.strictEqual(response.source, 'knowledge');
    });

    it('should fallback/handle no match gracefully', async () => {
        const response = await engine.processRequest({
            text: "unmatchable random query",
            locale: 'zh-TW',
            context: {
                currentStation: "odpt.Station:JR-East.Yamanote.Tokyo"
            }
        });

        // HybridEngine returns a fallback template if no AI match
        assert.ok(response !== null, 'Should handle no-match gracefully');
        assert.ok(response.source, `Got valid source: ${response.source}`);
    });
});
