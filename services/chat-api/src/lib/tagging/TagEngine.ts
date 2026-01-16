
export interface Tag {
    id: string;
    name: string;
    category: string;
    vector?: number[]; // Embedding vector
    baseWeight?: number;   // Importance weight (renamed from weight to baseWeight for clarity)
    weight?: number; // Calculated dynamic weight
    synonyms?: string[]; // For multi-dimensional parsing
}

export interface TagContext {
    userProfile: 'general' | 'wheelchair' | 'stroller';
    weather: 'clear' | 'rain' | 'snow' | 'cloudy';
    timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
    dateISO?: string; // e.g. "2026-01-01T12:00:00.000Z"
}

// Mock Dictionary for Tag Parsing
const TAG_DICTIONARY: Tag[] = [
    { id: 't1', name: 'elevator', category: 'facility', synonyms: ['lift', 'accessible'], baseWeight: 0.8, vector: [1, 0, 0] },
    { id: 't2', name: 'cafe', category: 'place', synonyms: ['coffee', 'starbucks'], baseWeight: 0.5, vector: [0, 1, 0] },
    { id: 't3', name: 'quiet', category: 'vibe', synonyms: ['silent', 'calm'], baseWeight: 0.6, vector: [0, 0, 1] },
    { id: 't4', name: 'wifi', category: 'amenity', synonyms: ['internet'], baseWeight: 0.4, vector: [0, 1, 1] },
    { id: 't5', name: 'indoor', category: 'environment', synonyms: ['inside', 'covered'], baseWeight: 0.5, vector: [0.5, 0.5, 0] },
    { id: 't6', name: 'park', category: 'place', synonyms: ['garden', 'green'], baseWeight: 0.5, vector: [0, 1, 0.5] },
    // Expanded Transit Tags
    { id: 't7', name: 'transfer', category: 'action', synonyms: ['change', 'connection', 'switch'], baseWeight: 0.9, vector: [0.8, 0.2, 0] },
    { id: 't8', name: 'ticket', category: 'item', synonyms: ['pass', 'fare', 'ic card', 'suica', 'pasmo'], baseWeight: 0.7, vector: [0.3, 0.9, 0] },
    { id: 't9', name: 'exit', category: 'location', synonyms: ['way out', 'gate', 'entrance'], baseWeight: 0.8, vector: [0.6, 0.6, 0] },
    { id: 't10', name: 'barrier_free', category: 'facility', synonyms: ['accessibility', 'wheelchair', 'ramp', 'slope'], baseWeight: 1.0, vector: [1, 0.5, 0] },
    { id: 't11', name: 'keiyo', category: 'line', synonyms: ['keiyo line', 'red line'], baseWeight: 0.8, vector: [0.5, 0.5, 0.5] },
    { id: 't12', name: 'walk', category: 'action', synonyms: ['walking', 'foot'], baseWeight: 0.4, vector: [0.2, 0.2, 0.2] }
];

export class TagEngine {
    
    /**
     * Parses a natural language query into structured Tags.
     * Uses simple tokenization and synonym matching (Mock NLP).
     */
    static parseQuery(query: string): Tag[] {
        const tokens = query.toLowerCase().split(/[\s,]+/);
        const foundTags: Tag[] = [];
        const seenIds = new Set<string>();

        tokens.forEach(token => {
            // Direct match or synonym match
            const match = TAG_DICTIONARY.find(t => 
                t.name === token || t.synonyms?.includes(token)
            );

            if (match && !seenIds.has(match.id)) {
                foundTags.push({ ...match }); // Clone to avoid mutating dictionary
                seenIds.add(match.id);
            }
        });

        return foundTags;
    }

    /**
     * Calculates the dynamic weight of a tag based on context.
     * Implements "Dynamic Weighting" core requirement.
     */
    static calculateContextualWeight(tag: Tag, context: TagContext): number {
        let weight = tag.baseWeight || 0.5;

        // Rule 1: User Profile Impact
        if (context.userProfile === 'wheelchair' || context.userProfile === 'stroller') {
            if (['elevator', 'ramp', 'accessible', 'step_free'].includes(tag.name)) {
                weight *= 2.0; // Critical boost
            }
            if (tag.category === 'facility') {
                weight *= 1.5; // General facility boost
            }
        }

        // Rule 2: Weather Impact
        if (['rain', 'snow'].includes(context.weather)) {
            if (tag.name === 'indoor' || tag.category === 'indoor') {
                weight *= 1.8; // Boost indoor
            }
            if (tag.name === 'park' || tag.category === 'outdoor') {
                weight *= 0.2; // Penalize outdoor
            }
        }

        // Rule 3: Time Impact (Example)
        if (context.timeOfDay === 'night' && tag.name === 'park') {
            weight *= 0.5; // Less relevant at night maybe
        }

        return parseFloat(weight.toFixed(2));
    }

    /**
     * Finds similar tags using Cosine Similarity on vectors.
     * Simulates Vector Search (Core Requirement).
     */
    static findSimilarTags(targetVector: number[], topK: number = 3): Tag[] {
        // In a real app, this would query a vector DB (e.g., pgvector).
        // Here we linear scan the mock dictionary.
        return TAG_DICTIONARY
            .filter(t => t.vector) // Only tags with vectors
            .map(tag => ({
                ...tag,
                score: this.cosineSimilarity(targetVector, tag.vector!)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Calculates Cosine Similarity between two tags based on their vectors.
     * If vectors are missing, falls back to string similarity (Levenshtein-based mock).
     */
    static calculateSimilarity(tagA: Tag, tagB: Tag): number {
        if (tagA.vector && tagB.vector) {
            return this.cosineSimilarity(tagA.vector, tagB.vector);
        }
        // Fallback: Jaccard Similarity of character bigrams for string matching
        return this.stringSimilarity(tagA.name, tagB.name);
    }

    private static cosineSimilarity(vecA: number[], vecB: number[]): number {
        // Pad vectors if lengths differ (naive approach, usually vectors are fixed dim)
        const maxLength = Math.max(vecA.length, vecB.length);
        const vA = [...vecA, ...Array(maxLength - vecA.length).fill(0)];
        const vB = [...vecB, ...Array(maxLength - vecB.length).fill(0)];

        const dotProduct = vA.reduce((sum, a, i) => sum + a * (vB[i] || 0), 0);
        const magA = Math.sqrt(vA.reduce((sum, a) => sum + a * a, 0));
        const magB = Math.sqrt(vB.reduce((sum, b) => sum + b * b, 0));
        
        if (magA === 0 || magB === 0) return 0;
        return dotProduct / (magA * magB);
    }

    private static stringSimilarity(str1: string, str2: string): number {
        const set1 = new Set(str1.split(''));
        const set2 = new Set(str2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    /**
     * Resolves conflicts between tags based on weight and context scores.
     * @param tags List of conflicting tags
     * @returns The winning tag
     */
    static resolveConflicts(tags: Tag[]): Tag | null {
        if (!tags.length) return null;
        
        // Sort by weight descending (assumes weight is already dynamic)
        return tags.sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    }

    /**
     * Maps tags across different schemas/libraries.
     * @param sourceTag 
     * @param targetSchema 
     */
    static mapTag(sourceTag: Tag, targetSchema: string): string {
        // Mock mapping logic
        // Real implementation would use a lookup table or semantic search
        return `${targetSchema}:${sourceTag.name}`;
    }
}
