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

        // 2. Fetch L2 Status (In a real app, this would check Redis/L2_Cache)
        // For MVP, we'll try to get it from the l2_cache table or fallback
        const { data: l2Cache } = await supabaseAdmin
            .from('l2_cache')
            .select('*')
            .eq('key', `l2:${identityNode.id}`)
            .maybeSingle();

        const l2Status = l2Cache?.value || { delay: 0, congestion: 1, transferIntensity: 0 };

        // 3. Process Commercial Rules
        const commercialActions: any[] = [];
        const rules: CommercialRule[] = Array.isArray(effectiveNode.commercial_rules) ? effectiveNode.commercial_rules : [];

        for (const rule of rules) {
            let triggered = false;

            if (rule.trigger.condition === 'delay' && l2Status.delay >= rule.trigger.threshold) {
                triggered = true;
            }
            // More triggers (crowd, weather) can be added here

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

        // 4. Fetch Expert Wisdom (L4)
        const knowledgeItems = knowledgeService.getKnowledgeByStationId(identityNode.id);
        const resolvedWisdom = {
            traps: knowledgeItems.filter(k => k.type === 'warning').map(k => ({ severity: k.priority > 80 ? 'critical' : 'medium', content: k.content, advice: '' })),
            hacks: knowledgeItems.filter(k => k.type === 'tip').map(k => k.content)
        };

        let wisdomSummary = '';

        if (resolvedWisdom) {
            const criticalTrap = resolvedWisdom.traps.find(t => t.severity === 'critical');
            const highTrap = resolvedWisdom.traps.find(t => t.severity === 'medium'); // downgrade check
            const hack = resolvedWisdom.hacks?.[0];

            if (criticalTrap) wisdomSummary += `[CRITICAL WARNING] ${criticalTrap.content}\n`;
            if (highTrap) wisdomSummary += `[WARNING] ${highTrap.content}\n`;
            if (hack) wisdomSummary += `[LOCAL TRICK] ${hack}\n`;
        }

        return {
            nodeId: identityNode.id,
            nodeName: identityNode.name?.[locale] || identityNode.name?.['zh-TW'] || identityNode.name?.en || identityNode.name?.ja || '',
            personaPrompt: effectiveNode.persona_prompt,
            l2Status,
            commercialActions: commercialActions.sort((a, b) => b.priority - a.priority),
            wisdomSummary,
            wisdom: resolvedWisdom,
            nodeLocation: (identityNode.lat && identityNode.lon) ? { lat: identityNode.lat, lng: identityNode.lon } : undefined
        };
    }
};
