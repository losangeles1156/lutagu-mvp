/**
 * AgentRuntimeContext - 統一情境注入機制
 * 
 * 為 Agent 提供「當下」的意識，包含：
 * - 時間：用於判斷末班車、營業時間
 * - 地點：當前 Node ID
 * - 用戶狀態：L5 避難優先級
 * - 會話 ID：用於歷史管理
 * - 推理結果快取：避免重複計算
 */

import { UserEvacuationProfile, EvacuationDecision } from '@/lib/l5/types';
import { TPIResult, CDRResult, WVCResult } from '@/lib/l4/types';
import { getJSTTime } from '@/lib/utils/timeUtils';

// =============================================================================
// Types
// =============================================================================

export type SupportedLocale = 'zh-TW' | 'zh' | 'en' | 'ja' | 'ar';

export interface ReasoningChainResult {
    tpi?: TPIResult;
    cdr?: CDRResult;
    wvc?: WVCResult;
    evacuation?: EvacuationDecision;
    timestamp: Date;
}

export interface AgentRuntimeContext {
    // 時間感知
    currentTime: Date;
    jstHour: number;
    isHoliday: boolean;
    holidayName?: string;

    // 空間感知
    nodeId: string | null;
    nodeName: string;
    wardCode?: string;

    // 用戶感知
    locale: SupportedLocale;
    userProfile: Partial<UserEvacuationProfile>;
    conversationId: string;

    // 推理快取
    lastReasoningResult?: ReasoningChainResult;

    // 請求元數據
    requestId: string;
    startTime: number;
}

// =============================================================================
// Factory
// =============================================================================

export interface CreateContextOptions {
    nodeId?: string;
    nodeName?: string;
    locale?: string;
    userProfile?: Partial<UserEvacuationProfile>;
    conversationId?: string;
    requestId?: string;
}

export function createAgentContext(options: CreateContextOptions): AgentRuntimeContext {
    const jst = getJSTTime();
    const now = Date.now();

    return {
        currentTime: jst.date,
        jstHour: jst.hour,
        isHoliday: jst.isHoliday,
        holidayName: jst.holidayName,

        nodeId: options.nodeId || null,
        nodeName: options.nodeName || 'Tokyo Station',
        wardCode: extractWardCode(options.nodeId),

        locale: normalizeLocale(options.locale),
        userProfile: options.userProfile || { preferredLocale: 'zh-TW' },
        conversationId: options.conversationId || generateConversationId(),

        requestId: options.requestId || generateRequestId(),
        startTime: now
    };
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeLocale(input?: string): SupportedLocale {
    const raw = String(input || '').trim().toLowerCase();
    if (raw.startsWith('ja')) return 'ja';
    if (raw.startsWith('en')) return 'en';
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('zh-cn') || raw === 'zh') return 'zh';
    return 'zh-TW';
}

function extractWardCode(nodeId?: string): string | undefined {
    // Example: odpt.Station:TokyoMetro.Ginza.Shibuya -> Shibuya -> 13113 (Shibuya Ward)
    // For MVP, we return undefined and let tools handle it
    return undefined;
}

function generateConversationId(): string {
    return `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateRequestId(): string {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// Context-Aware Tool Wrapper
// =============================================================================

/**
 * Creates a tool executor that has access to the runtime context.
 * This allows tools to read shared state without explicit parameters.
 */
export function createContextAwareExecutor<TParams, TResult>(
    context: AgentRuntimeContext,
    executor: (params: TParams, ctx: AgentRuntimeContext) => Promise<TResult>
): (params: TParams) => Promise<TResult> {
    return async (params: TParams) => {
        const result = await executor(params, context);
        return result;
    };
}

/**
 * Updates the reasoning cache in the context.
 * Call this after a reasoning tool completes.
 */
export function updateReasoningCache(
    context: AgentRuntimeContext,
    update: Partial<ReasoningChainResult>
): void {
    context.lastReasoningResult = {
        ...context.lastReasoningResult,
        ...update,
        timestamp: new Date()
    };
}

// =============================================================================
// L1 Context Helper
// =============================================================================

import { supabaseAdmin } from '@/lib/supabase';

export async function getL1Context(nodeId: string | null, locale: string): Promise<string> {
    if (!nodeId) return 'User is not currently at a specific station node.';

    try {
        const { data: node, error } = await supabaseAdmin
            .from('nodes')
            .select('*')
            .eq('id', nodeId)
            .single();

        if (error || !node) {
            console.warn(`[L1Context] Failed to fetch node ${nodeId}:`, error);
            return `User is at node ID: ${nodeId} (Details unavailable).`;
        }

        // Construct a simple context string
        // Note: For MVP we just use the name and description if available
        const name = locale === 'zh-TW' || locale === 'zh' ? (node.name_zh_tw || node.name_ja) : (node.name_en || node.name_ja);

        return `
[L1 LOCATION CONTEXT]
Current Station/Node: ${name} (${node.name_ja})
Node ID: ${node.id}
Description: ${node.description || 'No description available.'}
`;
    } catch (e) {
        console.error('[L1Context] Error:', e);
        return `User is at node ID: ${nodeId} (Error fetching details).`;
    }
}
