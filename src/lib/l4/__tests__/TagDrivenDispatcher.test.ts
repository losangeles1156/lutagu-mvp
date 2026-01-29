
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TagDrivenDispatcher } from '../skills/TagDrivenDispatcher';
import { DeepResearchSkill, SkillRegistry } from '../skills/SkillRegistry';
import { L1NodeProfile } from '../types/L1Profile';

// Mock Registry
const mockRegistry = new SkillRegistry();

// Mock Skills
class MockIdentitySkill implements DeepResearchSkill {
    name = "MockIdentity";
    priority = 10;
    definition = {
        name: "MockIdentity",
        description: "Identity focused",
        parameters: { type: "object" as const, properties: {} }
    };
    gemCapabilities = [];

    canHandle() { return false; }
    calculateRelevance() { return 0.5; } // Base
    async execute() { return null; }
}

class MockCapabilitySkill implements DeepResearchSkill {
    name = "MockCapability";
    priority = 10;
    definition = {
        name: "MockCapability",
        description: "Capability focused",
        parameters: { type: "object" as const, properties: {} }
    };
    gemCapabilities = ['TEST_CAP'];

    canHandle() { return false; }
    calculateRelevance() { return 0.5; } // Base
    async execute() { return null; }
}

mockRegistry.register(new MockIdentitySkill());
mockRegistry.register(new MockCapabilitySkill());

// Mock Context
const mockProfile: L1NodeProfile = {
    nodeId: 'test:node',
    core: { identity: ['TEST_ID'] },
    intent: { capabilities: ['TEST_CAP'] },
    vibe: { visuals: [] },
    weights: { transfer_ease: 1, tourism_value: 1, crowd_level: 1 }
};

describe('TagDrivenDispatcher', () => {
    const dispatcher = new TagDrivenDispatcher(mockRegistry);

    it('should boost Core Identity skills for Short Queries (< 5 chars)', async () => {
        // "MockIdentity" is hardcoded in Dispatcher to boost on Core (via name check fallback or future logic)
        // Currently Dispatcher hardcodes 'LocalGuide' and 'StandardRouting' for core boost.
        // Let's rely on the Attention Weights log logic or verify the score.
        // ATTENTION: The Dispatcher currently hardcodes 'StandardRouting'/'LocalGuide' for Core Boost.
        // We should update the test to use a Real skill name to verify logic, OR mock the dispatcher behavior.
        // For unit test purity, we'll assume the dispatcher logic we wrote:
        // if (skill.name === 'StandardRouting' || skill.name === 'LocalGuide')

        // Let's act as "LocalGuide" (which gets specific boost)
        class LocalGuideMock extends MockIdentitySkill { name = "LocalGuide"; }
        const coreRegistry = new SkillRegistry();
        coreRegistry.register(new LocalGuideMock());

        const coreDispatcher = new TagDrivenDispatcher(coreRegistry);

        const shortRes = await coreDispatcher.dispatch("Ueno", {
            nodeContext: {
                l1Profile: mockProfile,
                primaryNodeId: 'id',
                scope: 'station',
                intent: 'amenity',
                loadedTags: []
            }
        });

        // Base 0.5. Short Query -> Core Weight 1.5. Score should be 0.75
        assert.ok(shortRes !== null);
        assert.ok(shortRes.score > 0.7, `Score ${shortRes.score} should be boosted > 0.7`);
    });

    it('should boost Capability skills for Long Queries (> 5 chars) if Capability Matches', async () => {
        // MockCapabilitySkill has ['TEST_CAP']. Profile has ['TEST_CAP'].
        // Long query -> Intent Weight 1.2.

        const longRes = await dispatcher.dispatch("This is a long query string", {
            nodeContext: {
                l1Profile: mockProfile,
                primaryNodeId: 'id',
                scope: 'station',
                intent: 'amenity',
                loadedTags: []
            }
        });

        // Base 0.5 * 1.2 = 0.6
        // NOTE: Our MockCapabilitySkill is named "MockCapability". 
        // The dispatcher iterates ALL skills. 
        // We need to ensure "MockCapability" is the winner or at least check its calculation.
        // Since dispatch returns the BEST, and MockIdentity (0.5) vs MockCapability (0.6), Capability should win.

        assert.ok(longRes !== null);
        assert.strictEqual(longRes.skill.name, 'MockCapability');
        assert.strictEqual(longRes.score.toFixed(1), '0.6');
    });

    it('should NOT boost Capability skills if Capability is missing', async () => {
        // Profile WITHOUT 'TEST_CAP'
        const emptyProfile = { ...mockProfile, intent: { capabilities: [] } };

        const res = await dispatcher.dispatch("Long query string here", {
            nodeContext: {
                l1Profile: emptyProfile,
                primaryNodeId: 'id',
                scope: 'station',
                intent: 'amenity',
                loadedTags: []
            }
        });

        // Base 0.5. No boost.
        assert.ok(res !== null);
        assert.strictEqual(res.score, 0.5); // Should remain base score
    });
});
