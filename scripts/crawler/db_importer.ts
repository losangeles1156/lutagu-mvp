import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { L1Data, L4Data } from './types';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export class DbImporter {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    async initTables() {
        // Create crawler_raw_data table if it doesn't exist
        const { error } = await this.supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS crawler_raw_data (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    url TEXT UNIQUE NOT NULL,
                    title TEXT,
                    raw_structure JSONB,
                    metadata JSONB,
                    crawled_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `
        });

        if (error && !error.message.includes('permission denied')) {
            console.warn('[DbImporter] Could not create table via RPC, assuming it exists or handled manually.');
        }
    }

    async importL1(data: L1Data) {
        try {
            const { error } = await this.supabase
                .from('crawler_raw_data')
                .upsert({
                    url: data.url,
                    title: data.title,
                    raw_structure: JSON.parse(data.raw_structure),
                    metadata: data.metadata,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'url' });

            if (error) {
                console.error(`[DbImporter] Error importing L1 data for ${data.url}:`, error);
                throw error;
            }
        } catch (err) {
            console.error(`[DbImporter] Failed to import L1 data: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    async importL4(data: L4Data) {
        // Map L4Data to l4_knowledge_embeddings schema
        const { error } = await this.supabase
            .from('l4_knowledge_embeddings')
            .upsert({
                knowledge_type: data.knowledge_type,
                entity_id: data.entity_id,
                entity_name: data.entity_name,
                content: data.content,
                category: data.category,
                subcategory: data.subcategory,
                source: data.source,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error(`[DbImporter] Error importing L4 data:`, error);
            throw error;
        }
    }

    async isAlreadyCrawled(url: string): Promise<boolean> {
        const { data, error } = await this.supabase
            .from('l4_knowledge_embeddings')
            .select('source')
            .eq('source', url)
            .limit(1)
            .maybeSingle();

        return !!data;
    }
}
