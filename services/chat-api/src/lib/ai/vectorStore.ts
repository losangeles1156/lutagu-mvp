import { supabaseAdmin } from '../supabase';
import { generateLLMResponse } from './llmClient';

interface VectorSearchOptions {
    limit?: number;
    threshold?: number;
}

interface KnowledgeDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity?: number;
}

export class SupabaseVectorStore {
    private static instance: SupabaseVectorStore;

    // Model configuration
    private readonly EMBEDDING_MODEL = 'voyage-4-lite'; // Updated to match service
    private readonly DIMENSION = 1024; // Match the DB schema

    private constructor() { }

    public static getInstance(): SupabaseVectorStore {
        if (!SupabaseVectorStore.instance) {
            SupabaseVectorStore.instance = new SupabaseVectorStore();
        }
        return SupabaseVectorStore.instance;
    }

    /**
     * Generates embedding for a given text using EmbeddingService (defaults to Voyage if configured)
     */
    private async generateEmbedding(text: string): Promise<number[] | null> {
        try {
            // Import dynamically to avoid circular deps if any, though here it's fine
            const { EmbeddingService } = await import('./embeddingService');
            const embedding = await EmbeddingService.generateEmbedding(text, 'query');

            // Check for mock zero vector (failure)
            if (embedding.every(v => v === 0)) return null;

            return embedding;
        } catch (e) {
            console.error('[VectorStore] Embedding generation failed:', e);
            return null;
        }
    }

    /**
     * Search for similar documents in Supabase
     */
    public async search(query: string, options: VectorSearchOptions = {}): Promise<KnowledgeDocument[]> {
        const { limit = 5, threshold = 0.7 } = options;

        // 1. Generate Query Embedding
        const apiKey = process.env.VOYAGE_API_KEY;
        if (!apiKey) {
            console.warn('[VectorStore] No VOYAGE_API_KEY provided. Skipping semantic search.');
            return [];
        }

        try {
            const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    input: query,
                    model: this.EMBEDDING_MODEL,
                    input_type: 'query'
                })
            });

            const data = await response.json();
            const embedding = data.data?.[0]?.embedding;

            if (!embedding) return [];

            // 2. RPC call to Supabase (match_knowledge)
            // Note: You need to create this RPC function in Supabase SQL editor as well
            const { data: results, error } = await supabaseAdmin.rpc('match_knowledge', {
                query_embedding: embedding,
                match_threshold: threshold,
                match_count: limit
            });

            if (error) {
                console.error('[VectorStore] Supabase search error:', error);
                return [];
            }

            return results || [];

        } catch (e) {
            console.error('[VectorStore] Search failed:', e);
            return [];
        }
    }
}

export const vectorStore = SupabaseVectorStore.getInstance();
