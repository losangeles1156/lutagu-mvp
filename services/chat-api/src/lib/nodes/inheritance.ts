import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type NodeRow = {
    id: string;
    parent_hub_id: string | null;
    city_id?: string;
    name?: any;
    node_type?: string;
    persona_prompt?: string | null;
    commercial_rules?: any;
    facility_profile?: any;
    vibe_tags?: any;
};

export type ResolveNodeInheritanceResult = {
    leaf: NodeRow;
    hub: NodeRow | null;
    effective: NodeRow;
};

const INHERITANCE_SELECT = 'id,parent_hub_id,city_id,name,node_type,persona_prompt,commercial_rules,facility_profile,vibe_tags';

function isRecord(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqStrings(values: unknown[]) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of values) {
        const s = typeof v === 'string' ? v.trim() : '';
        if (!s) continue;
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

function mergeVibeTags(parent: any, child: any) {
    const p = isRecord(parent) ? parent : null;
    const c = isRecord(child) ? child : null;
    if (!p && !c) return null;
    if (!p) return c;
    if (!c) return p;

    const out: Record<string, any> = { ...p };
    for (const [locale, tags] of Object.entries(c)) {
        const pTags = Array.isArray((p as any)[locale]) ? (p as any)[locale] : [];
        const cTags = Array.isArray(tags) ? tags : [];
        out[locale] = uniqStrings([...(pTags as any[]), ...(cTags as any[])]);
    }
    return out;
}

function normalizeRules(value: any) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function mergeCommercialRules(parent: any, child: any) {
    const p = normalizeRules(parent);
    const c = normalizeRules(child);
    if (p.length === 0 && c.length === 0) return null;
    if (p.length === 0) return c;
    if (c.length === 0) return p;

    const out: any[] = [];
    const byId = new Map<string, number>();

    for (const rule of p) {
        out.push(rule);
        const id = typeof rule?.id === 'string' ? rule.id : '';
        if (id) byId.set(id, out.length - 1);
    }

    for (const rule of c) {
        const id = typeof rule?.id === 'string' ? rule.id : '';
        if (id && byId.has(id)) {
            out[byId.get(id)!] = rule;
        } else {
            out.push(rule);
            if (id) byId.set(id, out.length - 1);
        }
    }

    return out;
}

function pickPersona(parent: any, child: any) {
    const c = typeof child === 'string' ? child.trim() : '';
    if (c) return c;
    const p = typeof parent === 'string' ? parent.trim() : '';
    return p || null;
}

function pickJson(parent: any, child: any) {
    return child ?? parent ?? null;
}

function mergeInheritance(parent: NodeRow, child: NodeRow): NodeRow {
    return {
        ...child,
        persona_prompt: pickPersona(parent.persona_prompt, child.persona_prompt),
        commercial_rules: mergeCommercialRules(parent.commercial_rules, child.commercial_rules),
        facility_profile: pickJson(parent.facility_profile, child.facility_profile),
        vibe_tags: mergeVibeTags(parent.vibe_tags, child.vibe_tags)
    };
}

async function fetchNode(client: SupabaseClient, nodeId: string): Promise<NodeRow | null> {
    const { data, error } = await client.from('nodes').select(INHERITANCE_SELECT).eq('id', nodeId).maybeSingle();
    if (error || !data) return null;
    return data as any;
}

export async function resolveNodeInheritance(params: {
    nodeId: string;
    client?: SupabaseClient;
    maxDepth?: number;
}): Promise<ResolveNodeInheritanceResult | null> {
    const client = params.client || (supabase as any as SupabaseClient);
    const maxDepth = typeof params.maxDepth === 'number' ? params.maxDepth : 4;

    const leaf = await fetchNode(client, params.nodeId);
    if (!leaf) return null;

    let effective: NodeRow = { ...leaf };
    let hub: NodeRow | null = null;
    let nextParentId = leaf.parent_hub_id;
    const visited = new Set<string>([leaf.id]);
    let depth = 0;

    while (nextParentId && depth < maxDepth) {
        if (visited.has(nextParentId)) break;
        visited.add(nextParentId);

        const parent = await fetchNode(client, nextParentId);
        if (!parent) break;

        hub = parent;
        effective = mergeInheritance(parent, effective);
        nextParentId = parent.parent_hub_id;
        depth += 1;
    }

    return { leaf, hub, effective };
}

export async function getEffectivePersona(nodeId: string, client?: SupabaseClient) {
    const res = await resolveNodeInheritance({ nodeId, client });
    return res?.effective?.persona_prompt || null;
}
