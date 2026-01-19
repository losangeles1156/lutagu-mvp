
import { findStationIdsByName } from '../assistantEngine';

export class DataNormalizer {
    /**
     * Normalize station names by removing common suffixes and fuzzy matching
     */
    public static normalizeStationName(name: string): string {
        return name
            .replace(/(駅|站|station|よし)$/i, '')
            .trim();
    }

    /**
     * Enhanced station lookup with fuzzy matching
     */
    public static lookupStationId(name: string): string | null {
        const normalized = this.normalizeStationName(name);
        const candidates = findStationIdsByName(normalized);

        if (candidates.length > 0) return candidates[0];

        // Second pass: try even more aggressive normalization
        const simple = normalized.replace(/JR/i, '').trim();
        const simpleCandidates = findStationIdsByName(simple);
        return simpleCandidates.length > 0 ? simpleCandidates[0] : null;
    }
}
