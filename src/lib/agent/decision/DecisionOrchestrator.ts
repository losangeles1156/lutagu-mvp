import { TagLoader } from '@/lib/l4/TagLoader';
import { DynamicContextService } from '@/lib/l4/DynamicContextService';
import { classifyQuestion, extractRouteEndpointsFromText, extractDestinationOnlyIntent, normalizeOdptStationId } from '@/lib/l4/assistantEngine';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';
import type { NodeContext } from '@/lib/l4/types/NodeContext';
import { normalizeIntent } from './intentNormalizer';
import { buildSemanticRelay } from './semanticRelay';
import type { ContextPackage, DecisionPrepareResult } from './types';

export interface OrchestratorInput {
    text: string;
    locale: SupportedLocale;
    currentStation?: string;
}

function buildTagsContext(intent: ReturnType<typeof normalizeIntent>): string[] {
    const tags = new Set<string>();
    intent.userStateTags.forEach(t => tags.add(t));
    intent.constraints.forEach(t => tags.add(t));
    tags.add(`urgency:${intent.urgency}`);
    tags.add(`intent:${intent.intent}`);
    return Array.from(tags);
}

function mapIntentToRequiredTools(intent: string): string[] {
    switch (intent) {
        case 'route':
            return ['findRoute'];
        case 'status':
            return ['getTransitStatus'];
        case 'amenity':
            return ['getStationInfo'];
        case 'poi':
            return ['searchPOI'];
        case 'knowledge':
            return ['retrieveStationKnowledge'];
        case 'fare':
            return ['findRoute'];
        default:
            return [];
    }
}

async function resolveNodeContext(text: string, locale: SupportedLocale, currentStation?: string): Promise<NodeContext> {
    const classification = classifyQuestion(text, locale);
    const endpoints = extractRouteEndpointsFromText(text);

    let primaryNodeId: string | null = null;
    let secondaryNodeId: string | null = null;
    let scope: NodeContext['scope'] = 'global';

    if (endpoints && endpoints.originIds.length > 0) {
        primaryNodeId = endpoints.originIds[0];
        secondaryNodeId = endpoints.destinationIds?.[0] || classification.toStationId || null;
        scope = 'route';
    } else if (currentStation) {
        primaryNodeId = currentStation;
        secondaryNodeId = classification.toStationId || endpoints?.destinationIds?.[0] || null;
        scope = 'station';
    } else if (classification.toStationId) {
        primaryNodeId = classification.toStationId;
        scope = classification.kind === 'route' ? 'route' : 'station';
    }

    if (classification.kind === 'route' || classification.kind === 'fare') scope = 'route';
    if (classification.kind === 'amenity' || classification.kind === 'status') scope = 'station';

    if (primaryNodeId && scope === 'global') scope = 'station';

    let l1Profile = null;
    if (primaryNodeId) {
        l1Profile = await TagLoader.loadProfile(primaryNodeId);
        if (l1Profile) {
            l1Profile = await DynamicContextService.enrichProfile(l1Profile);
        }
    }

    return {
        primaryNodeId,
        secondaryNodeId,
        scope,
        intent: classification.kind as any,
        loadedTags: l1Profile ? [...l1Profile.core.identity, ...l1Profile.intent.capabilities] : [],
        l1Profile
    };
}

export async function prepareDecision(input: OrchestratorInput): Promise<DecisionPrepareResult> {
    const intent = normalizeIntent(input.text, input.locale);
    const relay = await buildSemanticRelay(input.text, input.locale);
    const nodeContext = await resolveNodeContext(input.text, input.locale, input.currentStation);
    const tags_context = buildTagsContext(intent);

    const context: ContextPackage = {
        nodeContext,
        tags_context,
        relay,
    };

    const requiredTools = mapIntentToRequiredTools(intent.intent);

    return { intent, context, requiredTools };
}

export function deriveToolArgs(params: {
    text: string;
    currentStation?: string;
    relayText?: string;
    tagsContext?: string[];
}) {
    const { text, currentStation, relayText, tagsContext } = params;
    const endpoints = extractRouteEndpointsFromText(text);

    let origin: string | null = null;
    let destination: string | null = null;

    if (endpoints?.originText && endpoints?.destinationText) {
        origin = endpoints.originText;
        destination = endpoints.destinationText;
    } else if (currentStation) {
        const destOnly = extractDestinationOnlyIntent(text);
        if (destOnly?.destinationText) {
            origin = currentStation;
            destination = destOnly.destinationText;
        }
    }

    if (!destination) {
        const zhMatch = text.match(/從\s*([^到\s]+)\s*到\s*([^?\s]+)/) || text.match(/([^从\s]+)\s*到\s*([^?\s]+)/);
        if (zhMatch) {
            origin = origin || zhMatch[1];
            destination = zhMatch[2];
        }
    }

    const stationQuery = currentStation || destination || origin || text;

    return {
        findRoute: origin && destination ? { origin, destination } : null,
        getTransitStatus: { lineOrStation: stationQuery },
        getStationInfo: { stationQuery, infoType: 'all' as const },
        searchPOI: { query: relayText || text, nearStation: currentStation || undefined, tagsContext },
        retrieveStationKnowledge: currentStation ? { stationId: normalizeOdptStationId(currentStation), query: relayText || text, tagsContext } : null,
    };
}
