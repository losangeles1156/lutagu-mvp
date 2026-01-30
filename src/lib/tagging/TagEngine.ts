
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
    // GEM 3-5-8 Standard Tags
    // Core (L1)
    { id: 'gem_hub', name: 'HUB', category: 'core', synonyms: ['hub', 'major station', 'terminal'], baseWeight: 1.0, vector: [1, 1, 1] },
    { id: 'gem_jr', name: 'JR', category: 'core', synonyms: ['jr', 'jr east'], baseWeight: 0.9, vector: [0.9, 0.5, 0.5] },

    // Intent (L2)
    { id: 'gem_transfer', name: 'TRANSFER', category: 'intent', synonyms: ['transfer', 'switch line', 'connection'], baseWeight: 0.9, vector: [0.8, 0.8, 0] },
    { id: 'gem_shopping', name: 'SHOPPING', category: 'intent', synonyms: ['shop', 'buy', 'store', 'mall'], baseWeight: 0.7, vector: [0.5, 0.9, 0.2] },
    { id: 'gem_commute', name: 'COMMUTE', category: 'intent', synonyms: ['work', 'office', 'rush hour'], baseWeight: 0.6, vector: [0.4, 0.4, 0.8] },
    { id: 'gem_luggage', name: 'LUGGAGE', category: 'intent', synonyms: ['baggage', 'suitcase', 'heavy bags'], baseWeight: 0.8, vector: [0.3, 0.8, 0.1] },
    { id: 'gem_flight', name: 'FLIGHT', category: 'intent', synonyms: ['airport', 'plane', 'fly', 'narita', 'haneda'], baseWeight: 0.9, vector: [0.2, 0.5, 0.9] },
    { id: 'gem_sightseeing', name: 'SIGHTSEEING', category: 'intent', synonyms: ['tour', 'visit', 'see'], baseWeight: 0.7, vector: [0.1, 0.9, 0.5] },
    { id: 'gem_dining', name: 'DINING', category: 'intent', synonyms: ['eat', 'food', 'restaurant', 'cafe', 'lunch', 'dinner'], baseWeight: 0.7, vector: [0.2, 0.8, 0.2] },

    // Core Facilities (Mapped to Intent in Profile)
    { id: 'gem_elevator', name: 'ELEVATOR', category: 'intent', synonyms: ['elevator', 'lift'], baseWeight: 1.0, vector: [1, 0, 0] },
    { id: 'gem_restroom', name: 'RESTROOM', category: 'intent', synonyms: ['toilet', 'wc', 'restroom'], baseWeight: 0.9, vector: [0.8, 0.2, 0] },

    // Vibe (L3)
    { id: 'gem_busy', name: 'BUSY', category: 'vibe', synonyms: ['crowded', 'packed', 'busy', 'rush'], baseWeight: 0.7, vector: [0.9, 0.9, 0] },
    { id: 'gem_quiet', name: 'QUIET', category: 'vibe', synonyms: ['calm', 'peaceful', 'silent', 'local'], baseWeight: 0.7, vector: [0.1, 0.1, 0.8] },
    { id: 'gem_modern', name: 'MODERN', category: 'vibe', synonyms: ['new', 'clean', 'shiny'], baseWeight: 0.5, vector: [0.8, 0.2, 0.8] },
    { id: 'gem_traditional', name: 'TRADITIONAL', category: 'vibe', synonyms: ['old', 'classic', 'edo', 'temple'], baseWeight: 0.6, vector: [0.2, 0.8, 0.5] }
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
                t.name.toLowerCase() === token || t.synonyms?.includes(token)
            );

            if (match && !seenIds.has(match.id)) {
                foundTags.push({ ...match }); // Clone to avoid mutating dictionary
                seenIds.add(match.id);
            }
        });

        return foundTags;
    }

    // ... existing calculateContextualWeight ...
    // ... existing findSimilarTags ...
    // ... existing calculateSimilarity ...
    // ... existing cosineSimilarity ...
    // ... existing stringSimilarity ...
    // ... existing resolveConflicts ...

    /**
     * Maps tags across different schemas/libraries.
     * Supports bidirectional mapping between User Query and GEM Profile Tags.
     * @param sourceTag
     * @param targetSchema 'GEM' | 'Display' | 'Query'
     */
    static mapTag(sourceTag: Tag, targetSchema: 'GEM' | 'Display' | 'Query' = 'GEM'): string {
        if (targetSchema === 'GEM') {
            // Map common query tags to GEM standard tags
            // e.g. 'elevator' -> 'ELEVATOR', 'crowded' -> 'BUSY'
            // Since we unified TAG_DICTIONARY, we check if the tag IS a GEM tag (UPPERCASE name)
            // If it is regular case, find the GEM equivalent (if any)

            // 1. If already GEM (all caps), return it
            if (sourceTag.name === sourceTag.name.toUpperCase()) return sourceTag.name;

            // 2. Find GEM tag that has this tag name as synonym
            const gemTag = TAG_DICTIONARY.find(t =>
                t.name === t.name.toUpperCase() && t.synonyms?.includes(sourceTag.name)
            );

            if (gemTag) return gemTag.name;

            // 3. Fallback: normalize
            return sourceTag.name.toUpperCase();
        }

        return sourceTag.name;
    }
}
