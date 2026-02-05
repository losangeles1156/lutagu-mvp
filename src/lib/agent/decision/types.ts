import { NodeContext } from '@/lib/l4/types/NodeContext';

export type DecisionIntentKind = 'route' | 'status' | 'amenity' | 'fare' | 'timetable' | 'poi' | 'knowledge' | 'unknown';

export interface IntentProfile {
    intent: DecisionIntentKind;
    urgency: 'low' | 'medium' | 'high';
    goal?: string;
    constraints: string[];
    userStateTags: string[]; // e.g., rush, luggage, stroller
}

export interface SemanticRelayResult {
    sourceText: string;
    relayText?: string;
    relayLanguage: 'en' | 'none';
    cacheKey?: string;
}

export interface ContextPackage {
    nodeContext: NodeContext;
    tags_context: string[]; // L4 context tags
    relay: SemanticRelayResult;
}

export interface DecisionTrace {
    intent: IntentProfile;
    relay: SemanticRelayResult;
    requiredTools: string[];
    toolCalls: Array<{ name: string; args: Record<string, any>; success: boolean }>;
    scenarioPreview?: string;
    warnings?: string[];
}

export interface ResponseSchema {
    primary_answer: string;
    scenario_preview: string;
    risk_warning: string;
    next_action: string;
    fallback_used: boolean;
}

export interface DecisionPrepareResult {
    intent: IntentProfile;
    context: ContextPackage;
    requiredTools: string[];
}
