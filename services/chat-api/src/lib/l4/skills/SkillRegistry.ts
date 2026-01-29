import type { HybridResponse, RequestContext } from '../HybridEngine';
import { ToolDefinition } from './schemas';
import { CacheService, getCache } from '../../cache/cacheService';

export interface SkillResult extends HybridResponse {
    // Skills must return a standard HybridResponse structure
}

export interface SkillPolicy {
    enableCache?: boolean;
    cacheTtlMs?: number;
    timeoutMs?: number;
    maxInputChars?: number;
    maxStringParamChars?: number;
}

export interface DeepResearchSkill {
    name: string;
    priority: number;
    definition: ToolDefinition; // Agentic Schema
    policy?: SkillPolicy;
    canHandle(input: string, context: RequestContext): boolean; // Legacy: Keyword match
    calculateRelevance(input: string, context: RequestContext): number; // Tag-Based Score (0.0 - 1.0)
    execute(input: string, context: RequestContext, params?: any): Promise<SkillResult | null>;

    // GEM-Logic: Dynamic Capability Definition
    gemCapabilities?: string[];
}

export interface SkillExecutionMeta {
    fromCache: boolean;
    durationMs: number;
    errorCode?: 'invalid_input' | 'invalid_params' | 'timeout' | 'exception';
}

const skillExecutionCache = getCache<SkillResult>('skill_execution', {
    maxSize: 800,
    ttlMs: 2 * 60 * 1000,
    evictionRatio: 0.1
});

function clampString(value: string, maxChars: number): string {
    if (!value) return '';
    if (value.length <= maxChars) return value;
    return value.slice(0, maxChars);
}

function hashString(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
}

function cleanInput(input: string, maxChars: number): string {
    return clampString(String(input || '').trim(), maxChars);
}

function isPlainObject(value: any): value is Record<string, any> {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function validateAndNormalizeParams(definition: ToolDefinition, params: any, maxStringChars: number): { ok: true; value: any } | { ok: false } {
    const input = isPlainObject(params) ? params : {};
    const properties = definition.parameters?.properties || {};
    const required = definition.parameters?.required || [];

    for (const key of required) {
        if (input[key] === undefined || input[key] === null || input[key] === '') return { ok: false };
    }

    const normalized: Record<string, any> = {};
    for (const [key, schema] of Object.entries(properties)) {
        if (input[key] === undefined || input[key] === null) continue;
        const v = input[key];

        if (schema?.type === 'string') {
            if (typeof v !== 'string') return { ok: false };
            const s = clampString(v.trim(), maxStringChars);
            if (schema?.enum && Array.isArray(schema.enum) && !schema.enum.includes(s)) return { ok: false };
            normalized[key] = s;
            continue;
        }

        if (schema?.type === 'boolean') {
            if (typeof v !== 'boolean') return { ok: false };
            normalized[key] = v;
            continue;
        }

        normalized[key] = v;
    }

    return { ok: true, value: normalized };
}

function buildSkillCacheKey(skill: DeepResearchSkill, input: string, context: RequestContext, params: any): string {
    const station = context.currentStation || '';
    const base = {
        skill: skill.definition?.name || skill.name,
        input: clampString(input, 240),
        inputHash: hashString(input),
        inputLength: input.length,
        station,
        params
    };
    return CacheService.generateKey('skill', base);
}

export async function executeSkill(skill: DeepResearchSkill, input: string, context: RequestContext, params?: any): Promise<{ result: SkillResult | null; meta: SkillExecutionMeta }> {
    const start = Date.now();

    const maxInputChars = skill.policy?.maxInputChars ?? 800;
    const maxStringParamChars = skill.policy?.maxStringParamChars ?? 200;
    const cleanedInput = cleanInput(input, maxInputChars);

    if (!cleanedInput) {
        return { result: null, meta: { fromCache: false, durationMs: Date.now() - start, errorCode: 'invalid_input' } };
    }

    const validatedParams = validateAndNormalizeParams(skill.definition, params, maxStringParamChars);
    if (!validatedParams.ok) {
        return { result: null, meta: { fromCache: false, durationMs: Date.now() - start, errorCode: 'invalid_params' } };
    }

    const enableCache = skill.policy?.enableCache ?? true;
    const ttlMs = skill.policy?.cacheTtlMs;
    const cacheKey = buildSkillCacheKey(skill, cleanedInput, context, validatedParams.value);

    if (enableCache) {
        const cached = skillExecutionCache.get(cacheKey);
        if (cached) {
            return { result: cached, meta: { fromCache: true, durationMs: Date.now() - start } };
        }
    }

    const timeoutMs = skill.policy?.timeoutMs ?? 8000;
    let timeoutHandle: any;

    try {
        const timeoutPromise = new Promise<null>((resolve) => {
            timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
        });

        const execPromise = skill.execute(cleanedInput, context, validatedParams.value);
        const result = await Promise.race([execPromise, timeoutPromise]);
        clearTimeout(timeoutHandle);

        if (!result) {
            return { result: null, meta: { fromCache: false, durationMs: Date.now() - start, errorCode: 'timeout' } };
        }

        if (enableCache) {
            skillExecutionCache.set(cacheKey, result, ttlMs);
        }

        return { result, meta: { fromCache: false, durationMs: Date.now() - start } };
    } catch (_e) {
        clearTimeout(timeoutHandle);
        return { result: null, meta: { fromCache: false, durationMs: Date.now() - start, errorCode: 'exception' } };
    }
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

    findByToolName(toolName: string): DeepResearchSkill | null {
        const key = String(toolName || '').trim();
        if (!key) return null;
        return this.skills.find(s => s.name === key || s.definition?.name === key) || null;
    }

    getSkills(): DeepResearchSkill[] {
        return this.skills;
    }
}

// Export a singleton instance
export const skillRegistry = new SkillRegistry();
