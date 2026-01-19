
import { supabase } from '@/lib/supabase';

// Abstract Base Repository
export abstract class BaseRepository<T> {
    protected tableName: string;
    // Simple in-memory cache for MVP
    protected cache: Map<string, { data: T; expiry: number }> = new Map();
    protected ttl: number = 60 * 1000; // 1 minute default

    constructor(tableName: string) {
        this.tableName = tableName;
    }

    protected getFromCache(key: string): T | null {
        const item = this.cache.get(key);
        if (item && item.expiry > Date.now()) {
            return item.data;
        }
        return null;
    }

    protected setCache(key: string, data: T) {
        this.cache.set(key, { data, expiry: Date.now() + this.ttl });
    }

    abstract findById(id: string): Promise<T | null>;
}

// L1 Repository: Nodes
export class NodeRepository extends BaseRepository<any> {
    constructor() {
        super('nodes');
    }

    async findById(id: string): Promise<any | null> {
        const cached = this.getFromCache(id);
        if (cached) return cached;

        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (data) this.setCache(id, data);
        return data || null;
    }
}

// L2 Repository: Status
export class StatusRepository extends BaseRepository<any> {
    constructor() {
        super('transit_dynamic_snapshot');
        this.ttl = 30 * 1000; // 30s for live data
    }

    async findById(stationId: string): Promise<any | null> {
        // Implementation for finding latest status
        return null; // TODO
    }

    async getLatestStatus(stationId: string): Promise<any> {
        const cached = this.getFromCache(stationId);
        if (cached) return cached;

        const { data } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('station_id', stationId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (data) this.setCache(stationId, data);
        return data;
    }
}
