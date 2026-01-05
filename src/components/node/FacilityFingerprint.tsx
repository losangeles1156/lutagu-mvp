'use client';

type FacilityCounts = Record<string, number | null | undefined>;

const P1_KEYS = [
    'convenience_count',
    'drugstore_count',
    'restaurant_count',
    'cafe_count',
    'shrine_count',
    'temple_count',
    'museum_count'
];

/**
 * L1 Facility Main Categories with multi-language support
 */
const CATEGORY_CONFIG: Record<string, { icon: string; labels: Record<string, string>; color: string }> = {
    // P1-1 Specific Counts (MVP Guide Priority)
    convenience_count: { icon: '🏪', labels: { 'zh-TW': '便利店', 'en': 'Convenience', 'ja': 'コンビニ' }, color: '#F97316' },
    drugstore_count: { icon: '💊', labels: { 'zh-TW': '藥妝', 'en': 'Drugstore', 'ja': 'ドラッグストア' }, color: '#0EA5E9' },
    restaurant_count: { icon: '🍴', labels: { 'zh-TW': '餐廳', 'en': 'Restaurants', 'ja': 'レストラン' }, color: '#EF4444' },
    cafe_count: { icon: '☕', labels: { 'zh-TW': '咖啡', 'en': 'Cafe', 'ja': 'カフェ' }, color: '#A855F7' },
    shrine_count: { icon: '⛩️', labels: { 'zh-TW': '神社', 'en': 'Shrine', 'ja': '神社' }, color: '#DC2626' },
    temple_count: { icon: '🙏', labels: { 'zh-TW': '寺廟', 'en': 'Temple', 'ja': '寺院' }, color: '#854D0E' },
    museum_count: { icon: '🎨', labels: { 'zh-TW': '博物館', 'en': 'Museum', 'ja': '博物館' }, color: '#6366F1' },

    // Broad Categories (Fallback)
    shopping: { icon: '🏬', labels: { 'zh-TW': '購物', 'en': 'Shopping', 'ja': 'ショッピング' }, color: '#EC4899' },
    dining: { icon: '🍜', labels: { 'zh-TW': '餐飲', 'en': 'Dining', 'ja': '飲食' }, color: '#F59E0B' },
    leisure: { icon: '🎭', labels: { 'zh-TW': '休閒', 'en': 'Leisure', 'ja': 'レジャー' }, color: '#8B5CF6' },
    medical: { icon: '🏥', labels: { 'zh-TW': '醫療', 'en': 'Medical', 'ja': '医療' }, color: '#EF4444' },
    finance: { icon: '🏦', labels: { 'zh-TW': '金融', 'en': 'Finance', 'ja': '金融' }, color: '#3B82F6' },
    education: { icon: '🎓', labels: { 'zh-TW': '教育', 'en': 'Education', 'ja': '教育' }, color: '#10B981' },
    workspace: { icon: '💻', labels: { 'zh-TW': '辦公', 'en': 'Workspace', 'ja': 'オフィス' }, color: '#6366F1' },
    nature: { icon: '🌳', labels: { 'zh-TW': '自然', 'en': 'Nature', 'ja': '自然' }, color: '#22C55E' },
    religion: { icon: '🙏', labels: { 'zh-TW': '信仰', 'en': 'Religion', 'ja': '宗教' }, color: '#B45309' },
    religious: { icon: '🙏', labels: { 'zh-TW': '信仰', 'en': 'Religion', 'ja': '宗教' }, color: '#B45309' },
    accommodation: { icon: '🏨', labels: { 'zh-TW': '住宿', 'en': 'Lodging', 'ja': '宿泊' }, color: '#3B82F6' },
    business: { icon: '🏢', labels: { 'zh-TW': '商務', 'en': 'Business', 'ja': 'ビジネス' }, color: '#0F172A' },
};

interface FacilityFingerprintProps {
    counts: FacilityCounts;
    locale?: string;
    onSelectCategory?: (category: string) => void;
}

export function FacilityFingerprint({ counts, locale = 'zh-TW', onSelectCategory }: FacilityFingerprintProps) {
    const entries = Object.entries(counts).filter(([_, count]) => typeof count === 'number' && count > 0);

    const p1 = entries
        .filter(([k]) => P1_KEYS.includes(k))
        .sort(([, a], [, b]) => (b as number) - (a as number));

    const rest = entries
        .filter(([k]) => !P1_KEYS.includes(k))
        .sort(([, a], [, b]) => (b as number) - (a as number));

    const sortedCategories = [...p1, ...rest].slice(0, 5);

    if (sortedCategories.length === 0) return null;

    return (
        <div
            className="flex flex-wrap gap-2 py-2"
            aria-label={locale === 'en' ? 'Facility fingerprint' : locale === 'ja' ? '生活機能の指紋' : '生活機能指紋'}
        >
            {sortedCategories.map(([category, count]) => {
                const config = CATEGORY_CONFIG[category];
                if (!config) return null;

                const label = config.labels[locale] || config.labels['en'] || category;

                return (
                    <button
                        key={category}
                        type="button"
                        onClick={() => onSelectCategory?.(category)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        title={`${label}: ${count}`}
                        aria-label={`${label}: ${count}`}
                        disabled={!onSelectCategory}
                    >
                        <span aria-hidden className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                        <span role="img" aria-label={label} className="text-sm">
                            {config.icon}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                            {count as number}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

