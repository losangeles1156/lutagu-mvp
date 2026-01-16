import { LocalizedText } from '../adapters/types';

/**
 * Standard multi-lingual translator for LUTAGU
 * Supports i18n keys for L1-L4 components
 */
export const Translator = {
    /**
     * Translates a vibe key into multi-lingual text
     */
    vibe(key: string): LocalizedText {
        const table: Record<string, LocalizedText> = {
            culture: { 'zh-TW': '文化脈動', ja: '文化', en: 'Culture' },
            geek: { 'zh-TW': '極客聖地', ja: 'ギーク', en: 'Geek' },
            historic: { 'zh-TW': '歷史底蘊', ja: '歷史', en: 'Historic' },
            luxury: { 'zh-TW': '奢華潮流', ja: 'ラグジュアリー', en: 'Luxury' },
            business: { 'zh-TW': '商務核心', ja: 'ビジネス', en: 'Business' },
            traditional: { 'zh-TW': '傳統風情', ja: '伝統', en: 'Traditional' },
            market: { 'zh-TW': '活力市集', ja: '市場', en: 'Market' },
            retro: { 'zh-TW': '復古懷舊', ja: 'レトロ', en: 'Retro' },
            temple: { 'zh-TW': '寺廟重鎮', ja: '寺院', en: 'Temple' },
            kitchen: { 'zh-TW': '廚具之街', ja: 'キッチン', en: 'Kitchen' },
            scholar: { 'zh-TW': '學問之殿', ja: '学問', en: 'Scholar' },
            government: { 'zh-TW': '政經中心', ja: '官庁街', en: 'Government' },
            academic: { 'zh-TW': '學術氛圍', ja: 'アカデミック', en: 'Academic' },
            curry: { 'zh-TW': '咖哩聖地', ja: 'カレーの街', en: 'Curry Hub' },
            theater: { 'zh-TW': '劇場文化', ja: '劇場', en: 'Theater' },
            art: { 'zh-TW': '藝術氣息', ja: 'アート', en: 'Art' },
            shopping: { 'zh-TW': '購物天堂', ja: 'ショッピング', en: 'Shopping' },
            dining: { 'zh-TW': '美食聚落', ja: 'グルメ', en: 'Dining' },
            religious: { 'zh-TW': '結緣聖地', ja: '縁結びの聖地', en: 'Spiritual Spot' },
            nature: { 'zh-TW': '自然秘境', ja: '自然の秘境', en: 'Nature Escape' },
            quiet_area: { 'zh-TW': '寧靜區域', ja: '閑静なエリア', en: 'Quiet Area' }
        };

        return table[key] || { 'zh-TW': key, ja: key, en: key };
    },

    /**
     * Helper to get a single language string from LocalizedText
     */
    getString(text: LocalizedText | string | undefined, locale: string = 'zh-TW'): string {
        if (!text) return '';
        if (typeof text === 'string') return text;
        return text[locale] || text['zh-TW'] || text['en'] || '';
    }
};
