import { createHash } from 'crypto';
import { getCached } from '@/lib/cache/redisCacheService';

interface EmbeddingResponse {
    embedding: number[];
}

export class EmbeddingService {
    // Configuration
    private static provider = process.env.EMBEDDING_PROVIDER || 'voyage'; // 'voyage' (default) | 'gemini' | 'openai'
    private static apiUrl = process.env.EMBEDDING_API_URL || 'https://api.voyageai.com/v1/embeddings';

    static async generateEmbedding(text: string, type: 'db' | 'query' = 'query'): Promise<number[]> {
        // Cache Key Strategy: provider + model + hash(text)
        // This ensures if we switch providers or models, we don't return invalid vectors.
        const hash = createHash('sha256').update(text).digest('hex');
        const cacheKey = `emb:${this.provider}:v4:${type}:${hash}`;

        return getCached(
            cacheKey,
            async () => {
                return this.generateFreshEmbedding(text, type);
            },
            60 * 60 * 24 * 7 // Cache for 7 days (Embeddings rarely change for same text)
        );
    }

    private static async generateFreshEmbedding(text: string, type: 'db' | 'query'): Promise<number[]> {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            console.warn(`[EmbeddingService] No API Key found for ${this.provider}. Returning mock embedding.`);
            return new Array(1024).fill(0);
        }

        try {
            // Primary provider based on configuration
            if (this.provider === 'voyage') {
                // Map 'db' -> 'document' for Voyage API
                const voyageType = type === 'db' ? 'document' : 'query';
                return await this.generateVoyageEmbedding(text, voyageType, apiKey);
            } else {
                return await this.generateGeminiEmbedding(text, apiKey);
            }
        } catch (error: any) {
            console.error(`[EmbeddingService] ${this.provider} failed:`, error.message || error);

            // Rate limit fallback (Not cached, to allow retries or different outcome)
            if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
                console.warn(`[EmbeddingService] Rate limit detected on ${this.provider}, falling back to Gemini`);
                try {
                    const geminiKey = this.getGeminiKey();
                    if (geminiKey) {
                        return await this.generateGeminiEmbedding(text, geminiKey);
                    }
                } catch (fallbackError: any) {
                    console.error('[EmbeddingService] Gemini fallback also failed:', fallbackError.message);
                }
            }

            // Last resort: zero vector
            return new Array(1024).fill(0);
        }
    }

    private static getApiKey(): string | undefined {
        if (this.provider === 'voyage') return process.env.VOYAGE_API_KEY;
        if (this.provider === 'gemini') return this.getGeminiKey();
        if (this.provider === 'openai') return process.env.OPENAI_API_KEY;
        return process.env.MINIMAX_API_KEY;
    }

    private static getGeminiKey(): string {
        return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    }

    private static async generateVoyageEmbedding(text: string, type: string, apiKey: string): Promise<number[]> {
        // Shared Space Optimization:
        // Use 'voyage-4-large' for indexing (document) for maximum precision.
        // Use 'voyage-4-lite' for searching (query) for maximum speed and lower cost.
        const model = type === 'document' ? 'voyage-4-large' : 'voyage-4-lite';

        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                input: [text],
                input_type: type // 'query' or 'document'
            })
        });

        const data = await response.json();

        if (response.ok && data.data && data.data[0]?.embedding) {
            return data.data[0].embedding; // Voyage-4 is 1024 dim
        }

        throw new Error(data.detail || 'Voyage API Error');
    }

    private static async generateGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        const result = await model.embedContent(text);
        const embedding = result.embedding.values; // 768 dimensions

        // ✅ Zero-pad to 1024 dimensions (compatible with Voyage table schema)
        const targetDim = 1024;
        if (embedding.length < targetDim) {
            return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
        }
        // If larger (unlikely for 004), truncate
        return embedding.slice(0, targetDim);
    }

}
