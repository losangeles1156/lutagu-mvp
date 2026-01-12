
interface EmbeddingResponse {
    embedding: number[];
}

export class EmbeddingService {
    // Use an OpenAI-compatible endpoint or default URL
    private static apiUrl = process.env.EMBEDDING_API_URL || 'https://api.minimax.io/v1/embeddings';

    static async generateEmbedding(text: string, type: 'db' | 'query' = 'query'): Promise<number[]> {
        const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
        // console.log(`[EmbeddingService] DEBUG: URL=${this.apiUrl}, KeyPrefix=${apiKey?.substring(0, 5)}...`);


        if (!apiKey) {
            console.warn('[EmbeddingService] No API Key found. Returning mock embedding (zero vector).');
            return new Array(1536).fill(0);
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'embo-01',
                    texts: [text],
                    type: type // 'db' for storage, 'query' for search
                })
            });

            const data = await response.json();

            // Handle MiniMax strict 0 status code for success
            if (response.ok && (data.base_resp?.status_code === 0 || !data.base_resp)) {
                if (data.vectors && data.vectors[0]) {
                    return data.vectors[0];
                }
                // OpenAI compatible fallback
                if (data.data && data.data[0]?.embedding) {
                    return data.data[0].embedding;
                }
            }

            console.error('[EmbeddingService] API Error:', JSON.stringify(data.base_resp || data, null, 2));
            throw new Error(`Embedding API Error: ${data.base_resp?.status_msg || 'Unknown Error'}`);
        } catch (error) {
            console.error('[EmbeddingService] Update failed:', error);
            // Fallback for stability
            return new Array(1536).fill(0);
        }
    }
}
