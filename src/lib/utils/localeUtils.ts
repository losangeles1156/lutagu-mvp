import { LocaleString } from '@/lib/types/stationStandard';

/**
 * Safely extracts the string for the current locale from a LocaleString object.
 * Fallbacks: requested locale -> en -> ja -> zh -> first available key -> empty string.
 * @param obj The LocaleString object { ja, en, zh }
 * @param locale The current locale code (e.g., 'ja', 'en', 'zh-TW', 'zh')
 */
export function getLocaleString(obj: LocaleString | string | undefined, locale: string): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj; // Legacy support or error case

    // Normalize locale (e.g., 'zh-TW' -> 'zh')
    const lang = locale.startsWith('zh') ? 'zh' : locale.split('-')[0]; // en-US -> en

    if (lang === 'ja' && obj.ja) return obj.ja;
    if (lang === 'en' && obj.en) return obj.en;
    if (lang === 'zh') {
        const zhVal = (obj as any)['zh-TW'] || (obj as any)['zh-Hant'] || obj.zh;
        if (zhVal) return zhVal;
        // Fallback for ZH: JA (Kanji) > EN
        return obj.ja || obj.en || '';
    }

    // Fallbacks
    return obj.en || obj.ja || obj.zh || '';
}

/**
 * Returns a bilingual string in the format "Primary (Secondary)".
 * - For EN users: "English (Native/Japanese)"
 * - For JA users: "Japanese (English)"
 * - For ZH users: "Chinese (Original/English)"
 */
export function getBilingualString(obj: LocaleString | string | undefined, locale: string): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;

    const primary = getLocaleString(obj, locale);
    let secondary = '';

    const lang = locale.startsWith('zh') ? 'zh' : locale.split('-')[0];

    // Determine secondary language
    if (lang === 'en') {
        // For English users, show Japanese (Native) if available
        secondary = obj.ja || '';
    } else {
        // For CJK users, show English as universal secondary
        secondary = obj.en || '';
        // If English is missing, try Japanese (for Chinese users) or fallback
        if (!secondary && lang === 'zh') {
            secondary = obj.ja || '';
        }
    }

    // Avoid duplication (e.g. if en == ja or primary == secondary)
    if (secondary && secondary.toLowerCase() !== primary.toLowerCase()) {
        return `${primary} (${secondary})`;
    }

    return primary;
}

export function toLocaleString(value: any): LocaleString {
    if (!value) return { ja: '', en: '', zh: '' };
    if (typeof value === 'string') return { ja: value, en: value, zh: value };
    if (typeof value === 'object') {
        // If it's already a LocaleString (has ja, en, or zh), return it but fill missing keys
        const ja = value.ja ?? value['ja-JP'] ?? value.jp ?? value.japanese ?? '';
        const en = value.en ?? value.english ?? '';
        const zh = value.zh ?? value['zh-TW'] ?? value['zh-Hant'] ?? value['zh_TW'] ?? value.chinese ?? '';

        // If it was already a valid LocaleString, just ensure it has all keys
        if (value.ja !== undefined || value.en !== undefined || value.zh !== undefined) {
            return { ja: ja || '', en: en || '', zh: zh || '' };
        }

        const anyText = ja || en || zh || '';
        return {
            ja: ja || anyText,
            en: en || anyText,
            zh: zh || anyText
        };
    }
    return { ja: '', en: '', zh: '' };
}

export type DisplayVibeChip = {
    id: string;
    label: LocaleString;
    count?: number;
};

export function normalizeVibeTagsForDisplay(input: any): DisplayVibeChip[] {
    if (!input) return [];

    if (Array.isArray(input)) {
        return input
            .flatMap((t: any, idx: number): DisplayVibeChip[] => {
                if (!t) return [];
                if (typeof t === 'string') {
                    return [{ id: `vibe-${idx}`, label: toLocaleString(t) }];
                }
                if (typeof t === 'object') {
                    const label = toLocaleString(t.label ?? t);
                    const id = String(t.id ?? `vibe-${idx}`);
                    const count = typeof t.count === 'number' ? t.count : (typeof t.score === 'number' ? t.score : undefined);
                    return typeof count === 'number' ? [{ id, label, count }] : [{ id, label }];
                }
                return [];
            })
            .filter(t => Boolean(t.id) && Boolean(t.label.ja || t.label.en || t.label.zh));
    }

    if (typeof input === 'object') {
        const zh = Array.isArray(input['zh-TW']) ? input['zh-TW'] : (Array.isArray(input.zh) ? input.zh : []);
        const ja = Array.isArray(input.ja) ? input.ja : [];
        const en = Array.isArray(input.en) ? input.en : [];
        const len = Math.max(zh.length, ja.length, en.length);
        return Array.from({ length: len })
            .map((_, idx) => {
                const anyText = en[idx] || ja[idx] || zh[idx] || '';
                const label: LocaleString = {
                    zh: zh[idx] || anyText,
                    ja: ja[idx] || anyText,
                    en: en[idx] || anyText
                };
                return { id: `vibe-${idx}`, label };
            })
            .filter(t => Boolean(t.label.ja || t.label.en || t.label.zh));
    }

    return [];
}
