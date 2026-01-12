import { HybridResponse, RequestContext } from '../HybridEngine';
import { ToolDefinition } from './schemas';

export interface SkillResult extends HybridResponse {
    // Skills must return a standard HybridResponse structure
}

export interface DeepResearchSkill {
    name: string;
    priority: number;
    definition: ToolDefinition; // Agentic Schema
    canHandle(input: string, context: RequestContext): boolean; // Keeping for hybrid fallback
    execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null>;
}

export class SkillRegistry {
    private skills: DeepResearchSkill[] = [];

    constructor() { }

    register(skill: DeepResearchSkill) {
        this.skills.push(skill);
        // Sort by priority descending (higher priority first)
        this.skills.sort((a, b) => b.priority - a.priority);
    }

    findMatchingSkill(input: string, context: RequestContext): DeepResearchSkill | null {
        const lowerInput = input.toLowerCase();
        for (const skill of this.skills) {
            if (skill.canHandle(lowerInput, context)) {
                return skill;
            }
        }
        return null;
    }

    getSkills(): DeepResearchSkill[] {
        return this.skills;
    }
}

// Export a singleton instance
export const skillRegistry = new SkillRegistry();
