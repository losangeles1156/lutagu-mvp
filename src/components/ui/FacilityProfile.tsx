import { CategoryCounts } from '@/lib/nodes/facilityProfileCalculator';
import { ShoppingBag, Utensils, Theater, Hospital, Landmark, GraduationCap, Music, Star, Home, Briefcase, Building, Leaf, Church } from 'lucide-react';

interface FacilityProfileProps {
    counts: CategoryCounts;
    vibeTags?: string[];
    showZero?: boolean;
}

// Basic icons mapping with colors and labels
const FACILITY_CONFIG: Record<string, { icon: any; label: string; color: string; bgColor: string; i18nKey: string }> = {
    medical: { icon: Hospital, label: '醫療', color: 'text-blue-500', bgColor: 'bg-blue-50', i18nKey: 'medical' },
    shopping: { icon: ShoppingBag, label: '購物', color: 'text-rose-500', bgColor: 'bg-rose-50', i18nKey: 'shopping' },
    dining: { icon: Utensils, label: '餐飲', color: 'text-orange-500', bgColor: 'bg-orange-50', i18nKey: 'dining' },
    leisure: { icon: Theater, label: '休閒', color: 'text-indigo-500', bgColor: 'bg-indigo-50', i18nKey: 'leisure' },
    education: { icon: GraduationCap, label: '教育', color: 'text-amber-500', bgColor: 'bg-amber-50', i18nKey: 'education' },
    finance: { icon: Landmark, label: '金融', color: 'text-emerald-500', bgColor: 'bg-emerald-50', i18nKey: 'finance' },
    accommodation: { icon: Home, label: '住宿', color: 'text-purple-500', bgColor: 'bg-purple-50', i18nKey: 'accommodation' },
    workspace: { icon: Briefcase, label: '辦公', color: 'text-slate-500', bgColor: 'bg-slate-50', i18nKey: 'workspace' },
    housing: { icon: Building, label: '居住', color: 'text-zinc-500', bgColor: 'bg-zinc-50', i18nKey: 'housing' },
    religion: { icon: Church, label: '信仰', color: 'text-red-500', bgColor: 'bg-red-50', i18nKey: 'religion' },
    nature: { icon: Leaf, label: '自然', color: 'text-green-600', bgColor: 'bg-green-50', i18nKey: 'nature' },
};

import { useTranslations } from 'next-intl';

export function FacilityProfile({ counts, vibeTags, showZero = false }: FacilityProfileProps) {
    const tFacility = useTranslations('facilityProfile');

    // Sort by count descending
    const sortedCategories = Object.entries(counts)
        .filter(([_, count]) => showZero || count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8); // Show top 8 categories (expanded from 6)

    return (
        <div className="flex flex-col gap-5">
            {/* 1. Personality Vibe Tags */}
            {vibeTags && vibeTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {vibeTags.map((tag, idx) => (
                        <span
                            key={tag}
                            className={`text-xs font-black px-3 py-1.5 rounded-xl shadow-sm border border-black/5 ${idx % 3 === 0 ? 'bg-indigo-600 text-white' :
                                idx % 3 === 1 ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-700'
                                }`}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* 2. Functional Personality (Category Radar-like Grid) */}
            <div className="grid grid-cols-2 gap-3">
                {sortedCategories.map(([category, count]) => {
                    const config = FACILITY_CONFIG[category] || { icon: Star, label: category, color: 'text-gray-500', bgColor: 'bg-gray-50', i18nKey: '' };
                    const Icon = config.icon;
                    return (
                        <div key={category} className={`flex items-center gap-3 p-3 rounded-2xl border border-black/[0.03] shadow-sm bg-white`}>
                            <div className={`p-2 rounded-xl ${config.bgColor} ${config.color}`}>
                                <Icon size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                    {config.i18nKey ? tFacility(config.i18nKey) : config.label}
                                </span>
                                <span className="text-sm font-bold text-gray-900">{count}+ {tFacility('countSuffix')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
