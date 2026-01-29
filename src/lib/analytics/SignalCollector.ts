

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

export interface CommerceSignal {
    type: 'IMPRESSION' | 'CLICK';
    actions: string[]; // List of Action IDs
    stationId?: string;
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

    /**
     * Collects a commerce signal (Impression/Click).
     */
    static async collectCommerceSignal(signal: CommerceSignal): Promise<void> {
        this.persistCommerceSignal(signal).catch(err => {
            console.error('[SignalCollector] Failed to persist commerce signal:', err);
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
            this.handleSupabaseError(error);
            return;
        }

        console.log(`[SignalCollector] Recorded signal: [${signal.policyCategory}] ${signal.intentTarget} (Unmet: ${signal.unmetNeed})`);
    }

    private static async persistCommerceSignal(signal: CommerceSignal): Promise<void> {
        const supabase = getSupabase();
        if (!supabase) return;

        // Note: Ideally this goes to a separate table 'commerce_signals'
        // For MVP, we might re-use demand_signals with a special category or create new table.
        // Let's assume we have a 'commerce_events' table or we map it to demand_signals for now.
        // Actually, let's look at demand_signals schema.
        // To be safe and clean, we will log to console and try to insert if table exists, else warn.

        const { error } = await supabase
            .from('commerce_events') // Proposed new table
            .insert({
                event_type: signal.type,
                action_ids: signal.actions,
                station_id: signal.stationId,
                metadata: signal.metadata
            });

        if (error) {
            // Fallback: Log to demand_signals as a generic event if commerce_events doesn't exist
            if (error.message.includes('relation "public.commerce_events" does not exist')) {
                await supabase.from('demand_signals').insert({
                    station_id: signal.stationId || 'global',
                    policy_category: 'expert_rule', // Abuse this category slightly or add new one
                    intent_target: `COMMERCE_${signal.type}`,
                    unmet_need: false,
                    metadata: { actions: signal.actions, original_error: error.message }
                });
            } else {
                this.handleSupabaseError(error);
            }
            return;
        }

        console.log(`[SignalCollector] Recorded Commerce: ${signal.type} [${signal.actions.join(', ')}]`);
    }

    private static handleSupabaseError(error: any) {
        const isMissingTable =
            error.message.includes('Could not find the table') ||
            error.message.includes('relation') && error.message.includes('does not exist');

        if (!isMissingTable) {
            console.error(`[SignalCollector] Supabase insert error: ${error.message}`);
        }
    }
}
