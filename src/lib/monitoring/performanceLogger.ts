/**
 * Performance Monitoring Utility
 * Lightweight logging for API response times and metrics
 */

import { supabaseAdmin } from '@/lib/supabase';

// ============ Types ============

export interface PerformanceMetric {
    requestId: string;
    endpoint: string;
    method: string;
    responseTimeMs: number;
    statusCode: number;
    userAgent?: string;
    locale?: string;
    metadata?: Record<string, any>;
}

export interface AIChatMetric {
    requestId: string;
    sessionId?: string;
    nodeId?: string;
    locale?: string;
    responseTimeMs: number;
    toolsCalled?: string[];
    inputLength?: number;
    outputLength?: number;
    hadError?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

// ============ Helpers ============

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get high-resolution timestamp for timing
 */
export function getTimestamp(): number {
    return Date.now();
}

/**
 * Calculate elapsed time in milliseconds
 */
export function getElapsedMs(startTime: number): number {
    return Date.now() - startTime;
}

// ============ Logging Functions ============

/**
 * Log API performance metric (non-blocking)
 * Designed to be called at the end of API handlers
 */
export function logPerformanceMetric(metric: PerformanceMetric): void {
    // Fire and forget - don't await to avoid blocking response
    _insertPerformanceMetric(metric).catch((error) => {
        console.warn('[PerfLog] Failed to log metric:', error.message);
    });
}

async function _insertPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    // Skip logging for certain endpoints to reduce noise
    const skipEndpoints = ['/api/health', '/api/ping', '/_next'];
    if (skipEndpoints.some(skip => metric.endpoint.includes(skip))) {
        return;
    }

    await supabaseAdmin.from('performance_metrics').insert({
        request_id: metric.requestId,
        endpoint: metric.endpoint,
        method: metric.method,
        response_time_ms: metric.responseTimeMs,
        status_code: metric.statusCode,
        user_agent: metric.userAgent,
        locale: metric.locale,
        metadata: metric.metadata || {},
    });
}

/**
 * Log AI chat metric (non-blocking)
 * Call at the end of AI chat processing
 */
export function logAIChatMetric(metric: AIChatMetric): void {
    _insertAIChatMetric(metric).catch((error) => {
        console.warn('[AILog] Failed to log AI metric:', error.message);
    });
}

async function _insertAIChatMetric(metric: AIChatMetric): Promise<void> {
    await supabaseAdmin.from('ai_chat_metrics').insert({
        request_id: metric.requestId,
        session_id: metric.sessionId,
        node_id: metric.nodeId,
        locale: metric.locale,
        response_time_ms: metric.responseTimeMs,
        tools_called: metric.toolsCalled || [],
        tool_count: metric.toolsCalled?.length || 0,
        input_length: metric.inputLength || 0,
        output_length: metric.outputLength || 0,
        had_error: metric.hadError || false,
        error_message: metric.errorMessage,
        metadata: metric.metadata || {},
    });
}

// ============ Analytics Queries ============

/**
 * Get API performance summary for last 24 hours
 */
export async function getAPIPerformanceSummary(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
        .from('v_api_performance_24h')
        .select('*');

    if (error) {
        console.error('[PerfLog] Failed to get API summary:', error);
        return [];
    }
    return data || [];
}

/**
 * Get AI quality summary for last 24 hours
 */
export async function getAIQualitySummary(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
        .from('v_ai_quality_24h')
        .select('*');

    if (error) {
        console.error('[PerfLog] Failed to get AI summary:', error);
        return [];
    }
    return data || [];
}

/**
 * Get hourly request volume for last 24 hours
 */
export async function getHourlyVolume(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
        .from('v_hourly_volume')
        .select('*');

    if (error) {
        console.error('[PerfLog] Failed to get hourly volume:', error);
        return [];
    }
    return data || [];
}

/**
 * Get recent slow requests (>1s)
 */
export async function getSlowRequests(limit: number = 20): Promise<any[]> {
    const { data, error } = await supabaseAdmin
        .from('performance_metrics')
        .select('*')
        .gt('response_time_ms', 1000)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[PerfLog] Failed to get slow requests:', error);
        return [];
    }
    return data || [];
}

/**
 * Get recent AI errors
 */
export async function getRecentAIErrors(limit: number = 20): Promise<any[]> {
    const { data, error } = await supabaseAdmin
        .from('ai_chat_metrics')
        .select('*')
        .eq('had_error', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[PerfLog] Failed to get AI errors:', error);
        return [];
    }
    return data || [];
}
