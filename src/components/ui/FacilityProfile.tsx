import { CategoryCounts } from '@/lib/nodes/facilityProfileCalculator';

interface FacilityProfileProps {
    counts: CategoryCounts;
    vibeTags?: string[];
    showZero?: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string }> = {
    shopping: { icon: '🛒', label: '購物' },
    dining: { icon: '🍜', label: '餐飲' },
    leisure: { icon: '🎭', label: '休閒' },
    medical: { icon: '🏥', label: '醫療' },
    finance: { icon: '🏦', label: '金融' },
    education: { icon: '🎓', label: '教育' },
};

export function FacilityProfile({ counts, vibeTags, showZero = false }: FacilityProfileProps) {
    // Sort by count descending
    const sortedCategories = Object.entries(counts)
        .filter(([_, count]) => showZero || count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); // Top 5

    return (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
            {/* Vibe Tags */}
            {vibeTags && vibeTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                    {vibeTags.map(tag => (
                        <span key={tag} className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Category Counts */}
            <div className="flex flex-wrap gap-3">
                {sortedCategories.map(([category, count]) => {
                    const config = CATEGORY_CONFIG[category];
                    if (!config) return null;
                    return (
                        <div key={category} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                            <span>{config.icon}</span>
                            <span className="font-semibold text-gray-700">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
