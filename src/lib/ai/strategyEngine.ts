import { supabaseAdmin } from '@/lib/supabase';
import { knowledgeService } from '@/lib/l4/knowledgeService';
import { resolveNodeInheritance } from '../nodes/inheritance';

export interface CommercialRule {
    id: string;
    trigger: {
        condition: 'delay' | 'crowd' | 'weather';
        threshold: number;
    };
    action: {
        type: 'taxi' | 'dining' | 'locker' | 'message';
        provider?: string;
        label: string;
        url?: string;
        priority: number;
    };
}

export interface StrategyContext {
    nodeId: string;
    nodeName: string;
    personaPrompt?: string;
    l2Status: any;
    commercialActions: any[];
    wisdomSummary?: string;
    wisdom?: any;
    nodeLocation?: { lat: number; lng: number };
}

function getNodeDisplayName(node: any, locale: string): string {
    return node?.name?.[locale] || node?.name?.['zh-TW'] || node?.name?.en || node?.name?.ja || '';
}

async function buildStrategyContextFromNode(params: {
    identityNode: any;
    effectiveNode: any;
    locale: string;
    l2CacheKeyId: string;
}): Promise<StrategyContext> {
    const { identityNode, effectiveNode, locale, l2CacheKeyId } = params;



    // Use Rust L2 Service with fallback or direct response
    let l2Status: any = { delay: 0, congestion: 1, transferIntensity: 0 };

    try {
        const { fetchL2Status } = await import('@/lib/api/rustServices');
        const rustStatus = await fetchL2Status(l2CacheKeyId);

        if (rustStatus) {
            // Polyfill 'delay' for compatibility with triggers
            const maxDelay = Array.isArray(rustStatus.line_status)
                ? Math.max(0, ...rustStatus.line_status.map((l: any) => l.delay_minutes || 0))
                : 0;

            l2Status = {
                ...rustStatus,
                delay: maxDelay,
                has_issues: (rustStatus.line_status?.length || 0) > 0 || maxDelay > 0
            };
        }
    } catch (e) {
        console.warn('[StrategyEngine] L2 fetch failed, using default:', e);
    }

    const commercialActions: any[] = [];
    const rules: CommercialRule[] = Array.isArray(effectiveNode?.commercial_rules) ? effectiveNode.commercial_rules : [];

    for (const rule of rules) {
        let triggered = false;

        if (rule.trigger.condition === 'delay') {
            const delayValue = Number(l2Status?.delay || l2Status?.delay_minutes || 0);
            const statusCode = String(l2Status?.status_code || '').toUpperCase();
            const hasIssues = Boolean(l2Status?.has_issues);
            const lineStatus = Array.isArray(l2Status?.line_status) ? l2Status.line_status : null;
            const hasLineIssue = Boolean(lineStatus && lineStatus.some((x: any) => x && x.status && x.status !== 'normal'));
            const hasDisruption = hasIssues || hasLineIssue || (statusCode && statusCode !== 'NORMAL' && statusCode !== 'OK');
            const effectiveDelay = delayValue > 0 ? delayValue : (hasDisruption ? rule.trigger.threshold : 0);

            if (effectiveDelay >= rule.trigger.threshold) triggered = true;
        }

        if (triggered) {
            commercialActions.push({
                type: rule.action.type,
                label: rule.action.label,
                provider: rule.action.provider,
                url: rule.action.url,
                priority: rule.action.priority
            });
        }
    }

    const knowledgeItems = knowledgeService.getKnowledgeByStationId(identityNode.id);
    const resolvedWisdom = {
        traps: knowledgeItems
            .filter(k => k.type === 'warning')
            .map(k => ({ severity: k.priority > 80 ? 'critical' : 'medium', content: k.content, advice: '' })),
        hacks: knowledgeItems.filter(k => k.type === 'tip').map(k => k.content)
    };

    let wisdomSummary = '';
    if (resolvedWisdom) {
        const criticalTrap = resolvedWisdom.traps.find(t => t.severity === 'critical');
        const highTrap = resolvedWisdom.traps.find(t => t.severity === 'medium');
        const hack = resolvedWisdom.hacks?.[0];

        if (criticalTrap) wisdomSummary += `[CRITICAL WARNING] ${criticalTrap.content}\n`;
        if (highTrap) wisdomSummary += `[WARNING] ${highTrap.content}\n`;
        if (hack) wisdomSummary += `[LOCAL TRICK] ${hack}\n`;
    }

    return {
        nodeId: identityNode.id,
        nodeName: getNodeDisplayName(identityNode, locale),
        personaPrompt: effectiveNode?.persona_prompt,
        l2Status,
        commercialActions: commercialActions.sort((a, b) => b.priority - a.priority),
        wisdomSummary,
        wisdom: resolvedWisdom,
        nodeLocation: (identityNode.lat && identityNode.lon) ? { lat: identityNode.lat, lng: identityNode.lon } : undefined
    };
}

/**
 * LUTAGU v3.0 Strategy Engine (L4)
 * Orchestrates L1 (DNA), L2 (Live), and Commercial Reality
 */
export const StrategyEngine = {
    /**
     * Synthesizes a strategy context for a given location
     */
    async getSynthesis(lat: number, lon: number, locale: string = 'zh-TW'): Promise<StrategyContext | null> {
        // 1. Find nearest Hub node (v3.0 priority)
        const { data: nodes, error: nodeError } = await supabaseAdmin
            .rpc('nearby_nodes', {
                center_lat: lat,
                center_lon: lon,
                radius_meters: 500 // Hub proximity range
            });

        if (nodeError || !nodes || nodes.length === 0) return null;

        const nearestNode = nodes[0];
        const resolved = await resolveNodeInheritance({ nodeId: String(nearestNode.id || ''), client: supabaseAdmin });
        const identityNode: any = resolved?.hub || resolved?.leaf || nearestNode;
        const effectiveNode: any = resolved?.effective || nearestNode;

        return buildStrategyContextFromNode({
            identityNode,
            effectiveNode,
            locale,
            l2CacheKeyId: identityNode.id
        });
    },

    async getSynthesisForNodeId(nodeId: string, locale: string = 'zh-TW'): Promise<StrategyContext | null> {
        const target = String(nodeId || '').trim();
        if (!target) return null;

        const resolved = await resolveNodeInheritance({ nodeId: target, client: supabaseAdmin });
        if (!resolved) return null;

        const identityNode: any = resolved.hub || resolved.leaf;
        const effectiveNode: any = resolved.effective;

        return buildStrategyContextFromNode({
            identityNode,
            effectiveNode,
            locale,
            l2CacheKeyId: identityNode.id
        });
    }
};
