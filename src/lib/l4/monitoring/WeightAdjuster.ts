
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Generic weighting interface
export interface NodeWeight {
    nodeId: string;
    clickWeight: number; // Multiplier (>1.0 = Boost)
    stayWeight: number;  // Multiplier (>1.0 = Boost)
    lastUpdated: Date;
}

export class WeightAdjuster {
    private static instance: WeightAdjuster;
    private supabase: SupabaseClient | null = null;

    // In-memory cache to reduce DB writes
    // Key: nodeId
    private weightCache: Map<string, NodeWeight> = new Map();

    // Configuration constants
    private readonly BOOST_FACTOR = 1.05; // 5% boost for positive signal
    private readonly DECAY_FACTOR = 0.95; // 5% decay for negative signal
    private readonly MAX_WEIGHT = 2.0;    // Cap weight at 2x
    private readonly MIN_WEIGHT = 0.5;    // Floor weight at 0.5x
    private readonly BATCH_SYNC_MS = 60 * 1000; // Sync to DB every minute

    private constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.startSyncLoop();
        } else {
            console.warn('[WeightAdjuster] Supabase credentials missing. Running in-memory only.');
        }
    }

    static getInstance(): WeightAdjuster {
        if (!this.instance) {
            this.instance = new WeightAdjuster();
        }
        return this.instance;
    }

    /**
     * Process a generic user signal for ANY node ID.
     * @param nodeId Generic ID (e.g. "odpt:Station:...", "poi:123", "custom:park")
     * @param signalType 'click' (interest) | 'bounce' (dissatisfaction) | 'stay' (deep engagement)
     */
    public async processSignal(nodeId: string, signalType: 'click' | 'bounce' | 'stay'): Promise<void> {
        let weight = this.weightCache.get(nodeId);

        if (!weight) {
            // Lazy load from DB or init default
            weight = await this.loadWeight(nodeId);
        }

        switch (signalType) {
            case 'click':
                weight.clickWeight = Math.min(weight.clickWeight * this.BOOST_FACTOR, this.MAX_WEIGHT);
                break;
            case 'stay':
                weight.stayWeight = Math.min(weight.stayWeight * this.BOOST_FACTOR, this.MAX_WEIGHT);
                // 'Stay' also slightly boosts click weight as confirmation
                weight.clickWeight = Math.min(weight.clickWeight * 1.02, this.MAX_WEIGHT);
                break;
            case 'bounce':
                // Bounce Punishes both
                weight.clickWeight = Math.max(weight.clickWeight * this.DECAY_FACTOR, this.MIN_WEIGHT);
                weight.stayWeight = Math.max(weight.stayWeight * this.DECAY_FACTOR, this.MIN_WEIGHT);
                break;
        }

        weight.lastUpdated = new Date();
        this.weightCache.set(nodeId, weight);

        console.log(`[WeightAdjuster] Updated ${nodeId}: Click=${weight.clickWeight.toFixed(2)}, Stay=${weight.stayWeight.toFixed(2)}`);
    }

    public async getWeights(nodeId: string): Promise<{ click: number, stay: number }> {
        const w = this.weightCache.get(nodeId) || await this.loadWeight(nodeId);
        return { click: w.clickWeight, stay: w.stayWeight };
    }

    private async loadWeight(nodeId: string): Promise<NodeWeight> {
        // Default
        const defaultWeight: NodeWeight = { nodeId, clickWeight: 1.0, stayWeight: 1.0, lastUpdated: new Date() };

        if (!this.supabase) return defaultWeight;

        try {
            const { data } = await this.supabase
                .from('station_weights')
                .select('*')
                .eq('node_id', nodeId)
                .single();

            if (data) {
                const w = {
                    nodeId,
                    clickWeight: data.click_weight,
                    stayWeight: data.stay_weight,
                    lastUpdated: new Date(data.last_updated)
                };
                this.weightCache.set(nodeId, w);
                return w;
            }
        } catch (e) {
            // Ignore error (row likely doesn't exist yet)
        }

        return defaultWeight;
    }

    private startSyncLoop() {
        if (!this.supabase) return;

        setInterval(async () => {
            if (this.weightCache.size === 0) return;

            console.log('[WeightAdjuster] Syncing weights to DB...');
            const upserts = Array.from(this.weightCache.values()).map(w => ({
                node_id: w.nodeId,
                click_weight: w.clickWeight,
                stay_weight: w.stayWeight,
                last_updated: w.lastUpdated.toISOString()
            }));

            // Clear cache after sync? No, keep it for read performance.
            // But maybe prune old ones? For MVP V4, keep all.

            const { error } = await this.supabase!
                .from('station_weights')
                .upsert(upserts, { onConflict: 'node_id' });

            if (error) console.error('[WeightAdjuster] Sync failed:', error);

        }, this.BATCH_SYNC_MS);
    }
}

export const weightAdjuster = WeightAdjuster.getInstance();
