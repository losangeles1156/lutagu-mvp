/**
 * FeedbackLooper - 閉環學習機制
 * 
 * 分析 demand_signals 表中的用戶需求信號，
 * 識別高頻未滿足需求並觸發知識補充。
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[FeedbackLooper] Supabase credentials missing.');
        return null;
    }

    try {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        return supabaseInstance;
    } catch (e) {
        console.error('[FeedbackLooper] Failed to initialize Supabase client:', e);
        return null;
    }
}

export interface UnmetNeedAggregate {
    station_id: string;
    intent_target: string;
    count: number;
    first_seen: string;
    last_seen: string;
}

export interface FeedbackLooperConfig {
    unmetNeedThreshold: number;  // Minimum count to trigger enrichment
    lookbackDays: number;        // Days to look back for signals
}

const DEFAULT_CONFIG: FeedbackLooperConfig = {
    unmetNeedThreshold: 5,
    lookbackDays: 7
};

export class FeedbackLooper {
    private config: FeedbackLooperConfig;

    constructor(config?: Partial<FeedbackLooperConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Analyze demand_signals table and return aggregated unmet needs.
     */
    async analyzeDemandSignals(): Promise<UnmetNeedAggregate[]> {
        const supabase = getSupabase();
        if (!supabase) return [];

        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - this.config.lookbackDays);

        try {
            // Aggregate unmet needs by station_id and intent_target
            const { data, error } = await supabase
                .from('demand_signals')
                .select('station_id, intent_target, created_at')
                .eq('unmet_need', true)
                .gte('created_at', lookbackDate.toISOString());

            if (error) {
                console.error('[FeedbackLooper] Query error:', error.message);
                return [];
            }

            if (!data || data.length === 0) return [];

            // Aggregate in-memory
            const aggregates: Map<string, UnmetNeedAggregate> = new Map();

            for (const row of data) {
                const key = `${row.station_id}::${row.intent_target}`;
                const existing = aggregates.get(key);

                if (existing) {
                    existing.count++;
                    if (row.created_at > existing.last_seen) {
                        existing.last_seen = row.created_at;
                    }
                } else {
                    aggregates.set(key, {
                        station_id: row.station_id,
                        intent_target: row.intent_target || 'Unknown',
                        count: 1,
                        first_seen: row.created_at,
                        last_seen: row.created_at
                    });
                }
            }

            // Filter by threshold and sort by count descending
            const results = Array.from(aggregates.values())
                .filter(a => a.count >= this.config.unmetNeedThreshold)
                .sort((a, b) => b.count - a.count);

            console.log(`[FeedbackLooper] Found ${results.length} high-priority unmet needs`);
            return results;

        } catch (e) {
            console.error('[FeedbackLooper] Analysis error:', e);
            return [];
        }
    }

    /**
     * Trigger knowledge enrichment for a specific station/topic.
     * This is a placeholder that logs the enrichment request.
     * In production, this could:
     * - Create a GitHub Issue
     * - Trigger a web crawler
     * - Call LLM to generate knowledge
     */
    async triggerKnowledgeEnrichment(stationId: string, intentTarget: string): Promise<void> {
        console.log(`[FeedbackLooper] 🔔 Enrichment triggered for station=${stationId}, topic=${intentTarget}`);

        // TODO: Implement actual enrichment logic
        // Options:
        // 1. GitHub Issue creation via GitHub API
        // 2. LLM-based knowledge generation
        // 3. Web crawling and extraction

        // For now, log to a dedicated table for tracking
        const supabase = getSupabase();
        if (!supabase) return;

        try {
            await supabase
                .from('enrichment_requests')
                .insert({
                    station_id: stationId,
                    intent_target: intentTarget,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
        } catch (e) {
            // Table might not exist, that's OK
            console.warn('[FeedbackLooper] Could not log enrichment request:', e);
        }
    }

    /**
     * Main loop: Analyze signals and trigger enrichment for high-priority needs.
     */
    async runAnalysisAndEnrich(): Promise<{ analyzed: number; enriched: number }> {
        const unmetNeeds = await this.analyzeDemandSignals();

        let enrichedCount = 0;
        for (const need of unmetNeeds) {
            await this.triggerKnowledgeEnrichment(need.station_id, need.intent_target);
            enrichedCount++;
        }

        return {
            analyzed: unmetNeeds.length,
            enriched: enrichedCount
        };
    }
}

// Singleton instance for easy access
export const feedbackLooper = new FeedbackLooper();
