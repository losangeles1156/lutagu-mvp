

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase Client Lazily
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('[SignalCollector] Supabase credentials missing. Signal collection disabled.');
        return null;
    }

    try {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        return supabaseInstance;
    } catch (e) {
        console.error('[SignalCollector] Failed to initialize Supabase client:', e);
        return null;
    }
}

export type PolicyCategory = 'traffic_vacuum' | 'overtourism' | 'hands_free' | 'barrier_free' | 'expert_rule';

export interface DemandSignal {
    stationId: string;
    policyCategory: PolicyCategory;
    intentTarget?: string;
    unmetNeed: boolean;
    lat?: number;
    lng?: number;
    metadata?: any;
}

export class SignalCollector {
    /**
     * Collects a demand signal asynchronously.
     * Designed to be "fire and forget" to avoid blocking the main AI response.
     */
    static async collectSignal(signal: DemandSignal): Promise<void> {
        // Fire and forget mechanism
        this.persistSignal(signal).catch(err => {
            console.error('[SignalCollector] Failed to persist signal:', err);
        });
    }

    private static async persistSignal(signal: DemandSignal): Promise<void> {
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase
            .from('demand_signals')
            .insert({
                station_id: signal.stationId,
                policy_category: signal.policyCategory,
                intent_target: signal.intentTarget,
                unmet_need: signal.unmetNeed,
                lat: signal.lat,
                lng: signal.lng,
                metadata: signal.metadata
            });

        if (error) {
            console.error(`[SignalCollector] Supabase insert error: ${error.message}`);
            // Don't throw to avoid crashing the AI flow
        } else {
            console.log(`[SignalCollector] Recorded signal: [${signal.policyCategory}] ${signal.intentTarget} (Unmet: ${signal.unmetNeed})`);
        }
    }
}
