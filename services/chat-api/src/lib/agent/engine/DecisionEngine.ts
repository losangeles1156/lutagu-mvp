
import { IAgentContext } from '../core/types';

export interface ISuggestion {
    id: string;
    content: string;
    score: number; // 0-1
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action?: any;
}

export class ContextEvaluator {
    evaluate(context: IAgentContext, nodeState: any): number {
        // Simple logic: returns an urgency score based on context
        // E.g., if user intent is "urgent", score is high
        if (context.intent?.includes('urgent') || context.intent?.includes('delay')) {
            return 0.9;
        }
        return 0.5;
    }
}

export class DecisionEngine {
    private evaluator: ContextEvaluator;

    constructor() {
        this.evaluator = new ContextEvaluator();
    }

    process(context: IAgentContext, nodeState: any, possibleActions: any[]): ISuggestion[] {
        const urgency = this.evaluator.evaluate(context, nodeState);
        console.log(`[DecisionEngine] Context Urgency: ${urgency}`);

        const suggestions: ISuggestion[] = possibleActions.map((action, idx) => {
            // Rank actions. If urgent, prioritize 'taxi' or 'alternative_route'
            let score = 0.5;
            if (urgency > 0.8 && action.type === 'taxi') score = 0.95;
            if (urgency < 0.5 && action.type === 'shop') score = 0.8;

            return {
                id: `sug_${idx}`,
                content: action.description || 'Suggestion',
                score,
                priority: score > 0.8 ? 'HIGH' : 'MEDIUM',
                action
            };
        });

        // Sort by score desc
        return suggestions.sort((a, b) => b.score - a.score);
    }
}
