import { AgentPlan } from './types';

/**
 * Utility for parsing [PLAN]...[/PLAN] tags from an agent's text stream.
 * Handles both closed blocks and unclosed trailing blocks for streaming support.
 */
export class PlanParser {
    private static readonly PLAN_REGEX = /\[PLAN\]([\s\S]*?)\[\/PLAN\]/gi;
    private static readonly OPEN_TAG_REGEX = /\[PLAN\]([\s\S]*)$/i;

    /**
     * Extracts all complete plan blocks from the text.
     */
    static parseComplete(text: string): AgentPlan[] {
        const plans: AgentPlan[] = [];
        let match;

        // Reset regex state
        this.PLAN_REGEX.lastIndex = 0;

        while ((match = this.PLAN_REGEX.exec(text)) !== null) {
            try {
                const planData = JSON.parse(match[1].trim());
                if (this.isValidPlan(planData)) {
                    plans.push(planData);
                }
            } catch (e) {
                console.error('[PlanParser] Failed to parse closed plan block:', e);
            }
        }

        return plans;
    }

    /**
     * Attempts to parse a trailing open tag for streaming updates.
     */
    static parseStreaming(text: string): Partial<AgentPlan> | null {
        // If there's an open [PLAN] tag at the end without a closing tag
        const match = text.match(this.OPEN_TAG_REGEX);
        if (!match) return null;

        try {
            // Attempt to parse whatever JSON has been accumulated so far
            // Note: JSON.parse will fail on partial JSON, so we might need 
            // a custom loose-json-parser if we want true streaming updates
            // For now, we only update on valid complete blocks within the stream or end.
            const rawContent = match[1].trim();

            // Simple check if it "looks" like complete JSON ending with }
            if (rawContent.endsWith('}')) {
                return JSON.parse(rawContent);
            }
        } catch (e) {
            // Silently ignore partial/invalid JSON in streaming mode
        }
        return null;
    }

    /**
     * Basic validation for extracted plan object.
     */
    private static isValidPlan(obj: any): obj is AgentPlan {
        return (
            obj &&
            typeof obj === 'object' &&
            typeof obj.id === 'string' &&
            Array.isArray(obj.items)
        );
    }

    /**
     * Cleaner version of the message text without plan tags.
     */
    static stripTags(text: string): string {
        return text
            .replace(this.PLAN_REGEX, '')
            .replace(this.OPEN_TAG_REGEX, '')
            .trim();
    }
}
