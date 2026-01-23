
import { getCached } from '@/lib/cache/redisCacheService';

export interface RerankResult {
    index: number;
    relevance_score: number;
    document?: string;
}

export class RerankService {
    private static apiUrl = 'https://api.voyageai.com/v1/rerank';
    private static model = 'rerank-2.5-lite';

    /**
     * Reranks a list of documents based on the query using Voyage Rerank 2.5 Lite.
     * @param query The search query.
     * @param documents Array of document strings to rerank.
     * @param topK Number of top results to return (default: all).
     * @returns Array of RerankResult, sorted by relevance score (descending).
     */
    static async rerank(query: string, documents: string[], topK?: number): Promise<RerankResult[]> {
        'use cache';
        const { cacheLife, cacheTag } = await import('next/cache');
        cacheLife('weeks');
        cacheTag('rerank-v1');

        if (!documents || documents.length === 0) return [];

        return this.performRerank(query, documents, topK);
    }

    private static async performRerank(query: string, documents: string[], topK?: number): Promise<RerankResult[]> {
        const apiKey = process.env.VOYAGE_API_KEY;
        if (!apiKey) {
            console.warn('[RerankService] Missing VOYAGE_API_KEY, returning original order.');
            return documents.map((doc, index) => ({ index, relevance_score: 0.5, document: doc }));
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    query: query,
                    documents: documents,
                    top_k: topK
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.error(`[RerankService] API Error: ${response.status} ${err}`);
                throw new Error(`Voyage Rerank API Error: ${response.status}`);
            }

            const data = await response.json();
            // Voyage returns { data: [{ index, relevance_score }] }
            // Join back with original document content for convenience
            const results: RerankResult[] = (data.data || []).map((item: any) => ({
                index: item.index,
                relevance_score: item.relevance_score,
                document: documents[item.index]
            }));

            return results;
        } catch (error) {
            console.error('[RerankService] Failed:', error);
            // Fallback: return original order
            return documents.map((doc, index) => ({ index, relevance_score: 0, document: doc }));
        }
    }

    private static hashString(str: string): string {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
}
