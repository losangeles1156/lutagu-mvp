// Basic counts interface (Aligned with v3.0 L1 categories)
export interface CategoryCounts {
    shopping: number;
    dining: number;
    medical: number;
    education: number;
    leisure: number;
    finance: number;
    accommodation: number;
    nature: number;
    religious: number;
    business: number;
}

export type LocalizedVibeTags = {
    'zh-TW': string[];
    'ja': string[];
    'en': string[];
};

// Logic to calculate dominant category and total
export function calculateProfileStats(counts: CategoryCounts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    // Find dominant
    let dominant = 'none';
    let max = 0;

    for (const [key, value] of Object.entries(counts)) {
        if (value > max) {
            max = value;
            dominant = key;
        }
    }

    return { total, dominant };
}

import { Translator } from '../utils/translator';

// Logic to generate multi-lingual Vibe Tags based on counts
export function generateLocalizedVibeTags(counts: CategoryCounts): LocalizedVibeTags {
    const zhTags: string[] = [];
    const jaTags: string[] = [];
    const enTags: string[] = [];

    const { total } = calculateProfileStats(counts);

    if (total === 0) {
        const t = Translator.vibe('quiet_area');
        return {
            'zh-TW': [t['zh-TW']],
            'ja': [t.ja || ''],
            'en': [t.en || '']
        };
    }

    const addTags = (key: string) => {
        const t = Translator.vibe(key);
        zhTags.push(t['zh-TW']);
        if (t.ja) jaTags.push(t.ja);
        if (t.en) enTags.push(t.en);
    };

    // Shopping
    if (counts.shopping >= 15) addTags('shopping');

    // Dining
    if (counts.dining >= 15) addTags('dining');

    // Religious
    if (counts.religious >= 3) addTags('religious');

    // Nature
    if (counts.nature >= 5) addTags('nature');

    // Business
    if (counts.business >= 10) addTags('business');

    return {
        'zh-TW': zhTags.slice(0, 3),
        'ja': jaTags.slice(0, 3),
        'en': enTags.slice(0, 3)
    };
}
