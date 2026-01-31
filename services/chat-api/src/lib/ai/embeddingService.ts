
interface EmbeddingResponse {
    embedding: number[];
}

export class EmbeddingService {
    // Configuration
    private static provider = process.env.EMBEDDING_PROVIDER || 'voyage'; // 'gemini' | 'minimax' | 'openai' | 'mistral' | 'voyage'
    private static apiUrl = process.env.EMBEDDING_API_URL || 'https://api.minimax.io/v1/embeddings';

    static async generateEmbedding(text: string, type: 'db' | 'query' = 'query'): Promise<number[]> {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            console.warn('[EmbeddingService] No API Key found. Returning mock embedding (zero vector).');
            return new Array(1536).fill(0);
        }

        try {
            // Primary provider based on configuration
            if (this.provider === 'gemini') {
                return await this.generateGeminiEmbedding(text, apiKey);
            } else if (this.provider === 'openai') {
                return await this.generateOpenAIEmbedding(text, apiKey);
            } else if (this.provider === 'mistral') {
                return await this.generateMistralEmbedding(text, apiKey);
            } else if (this.provider === 'voyage') {
                return await this.generateVoyageEmbedding(text, apiKey);
            } else {
                return await this.generateMiniMaxEmbedding(text, type, apiKey);
            }
        } catch (error: any) {
            console.error(`[EmbeddingService] ${this.provider} failed:`, error.message || error);

            // ✅ Rate limit fallback to Gemini
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
            return new Array(1536).fill(0);
        }
    }

    private static getApiKey(): string | undefined {
        if (this.provider === 'gemini') return this.getGeminiKey();
        if (this.provider === 'openai') return process.env.OPENAI_API_KEY;
        if (this.provider === 'mistral') return process.env.MISTRAL_API_KEY;
        if (this.provider === 'mistral') return process.env.MISTRAL_API_KEY;
        if (this.provider === 'voyage') return process.env.VOYAGE_API_KEY;
        return process.env.MINIMAX_API_KEY;
    }

    private static getGeminiKey(): string {
        return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    }

    private static async generateMistralEmbedding(text: string, apiKey: string): Promise<number[]> {
        const { Mistral } = require('@mistralai/mistralai');
        const client = new Mistral({ apiKey: apiKey });
        const response = await client.embeddings.create({
            model: 'mistral-embed',
            inputs: [text],
        });
        if (response.data && response.data[0] && response.data[0].embedding) {
            return response.data[0].embedding;
        }
        throw new Error('Mistral Embedding Error');
    }

    private static async generateGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
        // Use REST API for simplicity without extra deps if possible, or use @google/generative-ai if installed
        // Package.json has @google/generative-ai
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        const result = await model.embedContent(text);
        const embedding = result.embedding.values; // 768 dimensions

        // ✅ Zero-pad to 1536 dimensions (compatible with MiniMax/OpenAI format)
        const targetDim = 1536;
        if (embedding.length < targetDim) {
            return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
        }

        return embedding;
    }

    private static async generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
        // Allow overriding URL for compatible services (like Zeabur, Azure, etc.)
        const url = process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small', // Zeabur should support this standard model
                input: text
            })
        });
        const data = await response.json();
        if (data.data && data.data[0]?.embedding) {
            return data.data[0].embedding;
        }
        throw new Error(data.error?.message || 'OpenAI Error');
    }

    private static async generateMiniMaxEmbedding(text: string, type: 'db' | 'query', apiKey: string): Promise<number[]> {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'embo-01',
                texts: [text],
                type: type
            })
        });

        const data = await response.json();

        if (response.ok && (data.base_resp?.status_code === 0 || !data.base_resp)) {
            if (data.vectors && data.vectors[0]) return data.vectors[0];
            if (data.data && data.data[0]?.embedding) return data.data[0].embedding;
        }

        console.error('[EmbeddingService] API Error:', JSON.stringify(data.base_resp || data, null, 2));
        throw new Error(`Embedding API Error: ${data.base_resp?.status_msg || 'Unknown Error'}`);
    }
    private static async generateVoyageEmbedding(text: string, apiKey: string): Promise<number[]> {
        const model = process.env.VOYAGE_MODEL || 'voyage-4-lite'; // Updated to Voyage-4-lite
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: model,
                input_type: 'document'
                // output_dimension: 1024 // Optional: explicit dimension if needed, default is often 1024 for lite
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Voyage API Error: ${err}`);
        }

        const data = await response.json();
        return data.data?.[0]?.embedding || [];
    }
}
