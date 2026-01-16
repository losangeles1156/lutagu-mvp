/**
 * ODPT Station ID Normalization and Matching Utility
 * 
 * Handles variants like:
 * - odpt:Station:JR-East.Yamanote.Ueno
 * - odpt.Station:JR-East.Yamanote.Ueno
 */

export class IdMatcher {
    /**
     * Normalizes an ID to a standard dot-separated format after the prefix.
     * Example: "odpt:Station:JR-East.Tokyo" -> "odpt.Station:JR-East.Tokyo" (canonicalizing to dots)
     * Or vice-versa. Let's decide on a canonical format: OR just store both.
     */
    static normalize(id: string): string {
        if (!id) return '';
        let normalized = id.trim();

        // Add prefix if missing
        if (!normalized.startsWith('odpt')) {
            // Determine if it should be dot or colon based on content or just pick one
            // We'll use odpt.Station: as our canonical start
            normalized = `odpt.Station:${normalized}`;
        }

        // Standardize the separator after 'Station'
        return normalized
            .replace(/^odpt:Station:/, 'odpt.Station:')
            .replace(/^odpt\.Station\./, 'odpt.Station:');
    }

    /**
     * Get all common variants of an ID to use in lookups.
     */
    static getVariants(id: string): string[] {
        const normalized = this.normalize(id);
        if (!normalized) return [];

        const variants = new Set<string>();
        variants.add(normalized);
        variants.add(normalized.replace(/^odpt\.Station:/, 'odpt:Station:'));
        variants.add(normalized.replace(/^odpt\.Station:/, 'odpt.Station.'));

        // Also add versions with swapped dots/colons in the suffix if needed
        // but usually suffixes are consistent (e.g. JR-East.Yamanote.Ueno)

        return Array.from(variants);
    }

    /**
     * Robust matching between two IDs.
     */
    static isMatch(id1: string, id2: string): boolean {
        if (!id1 || !id2) return false;
        const n1 = this.normalize(id1);
        const n2 = this.normalize(id2);

        if (n1 === n2) return true;

        // Substring match for hub vs line-specific IDs
        // e.g. "odpt.Station:TokyoMetro.Tokyo" matches "odpt.Station:TokyoMetro.Marunouchi.Tokyo"
        const p1 = n1.split(':').pop() || '';
        const p2 = n2.split(':').pop() || '';

        if (p1 === p2) return true;

        // Handle "JR-East.Ueno" vs "JR-East.Yamanote.Ueno"
        const parts1 = p1.split('.');
        const parts2 = p2.split('.');

        const station1 = parts1[parts1.length - 1];
        const station2 = parts2[parts2.length - 1];
        const operator1 = parts1[0];
        const operator2 = parts2[0];

        if (station1 === station2 && operator1 === operator2) {
            return true;
        }

        return false;
    }

    /**
     * Extracts the core station identifier (e.g., Tokyo, Shinjuku) regardless of operator/line.
     */
    static getCoreName(id: string): string {
        const parts = id.split(/[:\.]/);
        return parts[parts.length - 1];
    }
}
