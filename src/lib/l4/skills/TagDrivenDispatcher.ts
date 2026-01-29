/**
 * Tag-Driven Skill Dispatcher (GEM-Logic)
 * 
 * Replaces simple keyword matching with Attention Fusion.
 * Core Philosophy:
 * - Short Query (< 5 chars): High weight on Core Tags (3-4 chars) -> "Tri-gram Sweet Spot"
 * - Long Query (> 5 chars): High weight on Intent Tags (5-8 chars) -> "Semantic Interaction"
 */

import { SkillRegistry, DeepResearchSkill, SkillResult } from './SkillRegistry';
import { RequestContext } from '../HybridEngine';

export class TagDrivenDispatcher {

    constructor(private registry: SkillRegistry) { }


    /**
     * Dispatch the most relevant skill based on Input Length and Tag Layers.
     * 
     * @param input User natural language query
     * @param context Fully populated context with GEM L1 Profile
     * @returns Best matching skill or null if relevance < threshold
     */
    async dispatch(input: string, context: RequestContext): Promise<{ skill: DeepResearchSkill, score: number } | null> {
        const skills = this.registry.getSkills();

        let bestSkill: DeepResearchSkill | null = null;
        let maxScore = -1;

        // GEM Logic: Determine Attention Mode
        // "Tri-gram Sweet Spot" is typically < 5 characters (Andromeda Retrieval)
        // Note: For CJK languages, 1 char ~ 1 token, so 2-3 chars is "short".
        // We use a heuristic length of 5 for generic safety.
        const isShortQuery = input.trim().length <= 5;

        // Calculate Attention Weights based on Input Length
        // Short Query -> Focus on IDENTITY (Core)
        // Long Query -> Focus on CAPABILITY (Intent)
        const attentionWeights = {
            core: isShortQuery ? 1.5 : 0.8,    // Boost Core if short
            intent: isShortQuery ? 0.5 : 1.2   // Boost Intent if long
        };

        for (const skill of skills) {
            let score = 0;

            // 1. Base Score (Skill's own logic)
            if (skill.calculateRelevance) {
                score = skill.calculateRelevance(input, context);
            } else {
                score = skill.canHandle(input, context) ? 0.3 : 0.0;
            }

            // 2. Attention Fusion Modulation
            if (context.nodeContext?.l1Profile) {
                const profile = context.nodeContext.l1Profile;

                // Core Layer Modulation (Identity Match)
                // If the input matches specific core tags (e.g. "Ueno"), this skill's relation to "Ueno" matters.
                // Since we don't have skill-to-tag mapping in the skill definition yet, 
                // we infer it: If a skill is "StandardRouting", it benefits from Core Identity.
                if (skill.name === 'StandardRouting' || skill.name === 'LocalGuide') {
                    score *= attentionWeights.core;
                }

                // Intent Layer Modulation (Capability Match)
                // DYNAMIC: Read capability directly from skill definition
                if (skill.gemCapabilities && skill.gemCapabilities.length > 0) {
                    const skillCaps = skill.gemCapabilities;
                    const nodeCaps = profile.intent.capabilities;

                    // Intersection: Does Node enable this skill?
                    // e.g. Node has 'LUGGAGE' -> Boost LuggageSkill
                    const hasMatch = skillCaps.some(cap => nodeCaps.includes(cap));

                    if (hasMatch) {
                        score *= attentionWeights.intent;
                    }
                }
            }

            console.log(`[TagDispatcher] Skill: ${skill.name}, Base: ${score.toFixed(2)}, Attn: [Core:${attentionWeights.core}, Intent:${attentionWeights.intent}]`);

            if (score > maxScore) {
                maxScore = score;
                bestSkill = skill;
            }
        }

        const THRESHOLD = 0.45; // Increased slightly for stricter matching
        if (bestSkill && maxScore >= THRESHOLD) {
            return { skill: bestSkill, score: maxScore };
        }

        return null;
    }
}
