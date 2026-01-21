
const SERVICE_URL = process.env.VECTOR_SEARCH_SERVICE_URL || 'http://localhost:8080';

export interface SearchResult {
    id: string;
    score: number;
    content: string;
    tags: string[];
}

export async function searchKnowledge(query: string, limit: number = 5, threshold: number = 0.5): Promise<SearchResult[]> {
    try {
        const response = await fetch(`${SERVICE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit, threshold })
        });

        if (!response.ok) {
            throw new Error(`Vector Service Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (err) {
        console.error('searchKnowledge Error:', err);
        throw err;
    }
}

export async function upsertKnowledge(id: string, content: string, tags: string[] = []): Promise<boolean> {
    try {
        const response = await fetch(`${SERVICE_URL}/upsert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, content, tags })
        });

        if (!response.ok) {
            throw new Error(`Vector Service Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.success;
    } catch (err) {
        console.error('upsertKnowledge Error:', err);
        throw err;
    }
}

