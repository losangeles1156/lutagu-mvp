
import { findStationIdsByName, normalizeOdptStationId } from '../assistantEngine';
import CORE_TOPOLOGY from '../generated/coreTopology.json';

type StationTitle = { 'zh-TW'?: string; ja?: string; en?: string };

const STATION_TITLE_BY_ID = new Map<string, StationTitle>();

(CORE_TOPOLOGY as any[]).forEach(railway => {
    railway.stationOrder?.forEach((s: any) => {
        const id = normalizeOdptStationId(String(s.station || ''));
        if (!id) return;
        const title = (s.title || {}) as StationTitle;
        const existing = STATION_TITLE_BY_ID.get(id) || {};
        STATION_TITLE_BY_ID.set(id, { ...existing, ...title });
    });
});

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

    public static getStationDisplayName(id: string, locale: 'zh-TW' | 'ja' | 'en' = 'zh-TW'): string {
        if (!id) return '';
        const normalized = normalizeOdptStationId(id);
        const title = STATION_TITLE_BY_ID.get(normalized);
        const label = locale === 'ja'
            ? title?.ja
            : locale === 'en'
                ? title?.en
                : (title?.['zh-TW'] || title?.ja || title?.en);
        if (label) return label;
        const raw = normalized.split(':').pop() || normalized;
        const parts = raw.split('.');
        return parts[parts.length - 1] || raw;
    }
}
