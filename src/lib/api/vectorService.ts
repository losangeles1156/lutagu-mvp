/**
 * Vector Search Service Client
 * 
 * Connects the main Next.js application to the vector-search-rs service
 * for semantic knowledge retrieval (RAG).
 */

const VECTOR_API_URL = process.env.VECTOR_SEARCH_API_URL || 'http://localhost:8080';

export interface VectorSearchResult {
    id: string;
    score: number;
    payload: {
        content: string;
        source?: string;
        category?: string;
        station_id?: string;
        [key: string]: any;
    };
}

export interface VectorUpsertPayload {
    id: string;
    vector: number[];
    payload: Record<string, any>;
}

export interface VectorSearchFilter {
    node_id?: string;
    tags?: string[];
}

/**
 * Search the vector database for semantically similar content.
 * Uses the vector-search-rs HTTP API.
 */
export async function searchVectorDB(
    query: string,
    topK: number = 5,
    filter?: VectorSearchFilter
): Promise<VectorSearchResult[]> {
    try {
        const url = `${VECTOR_API_URL}/search`;

        console.log(`[VectorTelemetry] Search Query: "${query.substring(0, 50)}..."`);
        console.log(`[VectorTelemetry] Filter: ${JSON.stringify(filter || {})}`);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK, filter }),
            // Short cache for real-time relevance
            next: { revalidate: 30 }
        });

        if (!res.ok) {
            console.error(`[VectorService] Search failed: ${res.status} ${res.statusText}`);
            return [];
        }

        const data = await res.json();
        const results = data.results || [];

        // Mock Pruning Ratio Calculation (Real logic would require Total Count from DB)
        // For now, we log that filtering was applied.
        if (filter?.node_id || filter?.tags) {
            console.log(`[VectorTelemetry] Context Pruning Active. Returned ${results.length} relevant docs.`);
        } else {
            console.warn(`[VectorTelemetry] ⚠️ Naked Search (No Context Pruning)`);
        }

        return results;
    } catch (e) {
        console.error('[VectorService] Search error:', e);
        return [];
    }
}

/**
 * Upsert a document into the vector database.
 * Requires pre-computed embedding vector.
 */
export async function upsertToVectorDB(
    documents: VectorUpsertPayload[]
): Promise<boolean> {
    try {
        const url = `${VECTOR_API_URL}/upsert`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: documents })
        });

        if (!res.ok) {
            console.error(`[VectorService] Upsert failed: ${res.status}`);
            return false;
        }

        console.log(`[VectorService] Upserted ${documents.length} documents`);
        return true;
    } catch (e) {
        console.error('[VectorService] Upsert error:', e);
        return false;
    }
}

/**
 * Health check for the vector service.
 */
export async function checkVectorServiceHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${VECTOR_API_URL}/health`, {
            next: { revalidate: 60 }
        });
        return res.ok;
    } catch {
        return false;
    }
}
