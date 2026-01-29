
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SkillRegistry, DeepResearchSkill } from '../skills/SkillRegistry';

class DummySkill implements DeepResearchSkill {
    name: string;
    priority: number;
    definition = {
        name: "dummy",
        description: "",
        parameters: { type: "object" as const, properties: {} }
    };
    gemCapabilities = [];

    constructor(name: string, priority: number) {
        this.name = name;
        this.priority = priority;
    }
    canHandle() { return false; }
    calculateRelevance() { return 0; }
    async execute() { return null; }
}

describe('SkillRegistry', () => {
    it('should sort skills by priority (High to Low)', () => {
        const registry = new SkillRegistry();
        registry.register(new DummySkill('Low', 10));
        registry.register(new DummySkill('High', 100));
        registry.register(new DummySkill('Med', 50));

        const skills = registry.getSkills();
        assert.strictEqual(skills[0].name, 'High');
        assert.strictEqual(skills[1].name, 'Med');
        assert.strictEqual(skills[2].name, 'Low');
    });

    it('should find skills by tool name', () => {
        const registry = new SkillRegistry();
        registry.register(new DummySkill('MyTool', 10));

        const found = registry.findByToolName('MyTool');
        assert.ok(found);
        assert.strictEqual(found.name, 'MyTool');
    });

    it('should return null for unknown tool names', () => {
        const registry = new SkillRegistry();
        const found = registry.findByToolName('GhostTool');
        assert.strictEqual(found, null);
    });
});
