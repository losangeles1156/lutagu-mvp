'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    MapPin, X, Star, Lightbulb, ChevronRight,
    Coffee, ShoppingBag, Landmark, Utensils, Bed, TreePine,
    Hospital, Building2, Briefcase, Search, Sparkles, Store
} from 'lucide-react';
import { getLocaleString, normalizeVibeTagsForDisplay } from '@/lib/utils/localeUtils';
import { useStationDNA, L1CategorySummary, VibeTag, VIBE_RULES } from '@/hooks/useStationDNA';
import { PlaceCard } from './PlaceCard';
import { useL1Places, L1Place } from '@/hooks/useL1Places';
import { useCategoryTranslation } from '@/hooks/useCategoryTranslation';

import { StationUIProfile } from '@/lib/types/stationStandard';

// Enhanced Icon Map with Colors
const CATEGORY_STYLE: Record<string, { icon: any; color: string; bgColor: string; borderColor: string }> = {
    dining: { icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
    shopping: { icon: Store, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-100' },
    culture: { icon: Landmark, color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
    leisure: { icon: Coffee, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100' },
    nature: { icon: TreePine, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-100' },
    medical: { icon: Hospital, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-100' },
    business: { icon: Building2, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100' },
    service: { icon: Landmark, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' },
    finance: { icon: Briefcase, color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-100' },
    accommodation: { icon: Bed, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
    default: { icon: MapPin, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
};

// 從景點資料動態計算類別統計
function calculateCategoryStats(places: L1Place[]): Record<string, number> {
    const stats: Record<string, number> = {};
    places.forEach(place => {
        const cat = place.category || 'default';
        stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
}

type CategorySummary = {
    id: string;
    count: number;
    representative_spots: L1Place[];
};

// 將統計資料轉換為 L1CategorySummary 陣列
function statsToCategorySummaries(
    stats: Record<string, number>,
    places: L1Place[]
): CategorySummary[] {
    return Object.entries(stats).map(([id, count]) => ({
        id,
        count,
        representative_spots: places.filter(p => p.category === id)
    })).sort((a, b) => b.count - a.count);
}

export function L1_DNA({ data }: { data: StationUIProfile }) {
    const tL1 = useTranslations('l1');
    const tTag = useTranslations('tag');
    const { getCategoryLabel, getSubcategoryLabel } = useCategoryTranslation();
    const locale = useLocale();

    // 使用 useL1Places 獲取實際景點資料
    const { places: l1Places, loading: placesLoading } = useL1Places();
    
    // 靜態 DNA 資料（用於 title、tagline、vibe_tags）
    const { title, tagline, vibe_tags } = useStationDNA({ ...data.l1_dna, name: data.name, id: data.id }, locale);

    // 動態計算類別統計
    const dynamicCategoryStats = useMemo(() => {
        return calculateCategoryStats(l1Places);
    }, [l1Places]);

    // 動態類別列表
    const dynamicCategories = useMemo(() => {
        return statsToCategorySummaries(dynamicCategoryStats, l1Places);
    }, [dynamicCategoryStats, l1Places]);

    const displayVibeTags = useMemo(() => {
        if (vibe_tags && vibe_tags.length > 0) {
            return vibe_tags.map((t: VibeTag) => ({ id: t.id, label: t.label, count: t.count }));
        }

        return normalizeVibeTagsForDisplay(data.l1_dna?.vibe_tags || []);
    }, [vibe_tags, data]);

    // Vibe Tag Interaction
    const [activeVibeFilter, setActiveVibeFilter] = useState<string | null>(null);

    const filteredCategoryList = useMemo(() => {
        let list: CategorySummary[] = [];

        if (l1Places.length > 0) {
            list = dynamicCategories;
        } else {
            const raw = (data.l1_dna?.categories || {}) as Record<string, any>;
            list = Object.values(raw).map(cat => ({
                id: String(cat?.id || ''),
                count: Number(cat?.count || 0),
                representative_spots: []
            })).filter(cat => cat.id);
        }

        if (activeVibeFilter) {
            const rule = VIBE_RULES.find(r => r.id === activeVibeFilter);
            if (rule && rule.relatedCategories) {
                const related = list.filter(cat => rule.relatedCategories?.includes(cat.id));
                if (related.length > 0) {
                    list = related;
                }
            }
        }

        return list;
    }, [data.l1_dna?.categories, dynamicCategories, l1Places.length, activeVibeFilter]);

    const handleVibeClick = (vibeId: string) => {
        setActiveVibeFilter(prev => prev === vibeId ? null : vibeId);
    };

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<CategorySummary | null>(null);
    const [activeSubcategory, setActiveSubcategory] = useState<string>('all');

    const toggleDrawer = (categoryId: string | null) => {
        if (categoryId) {
            // 從動態類別列表中查找
            const cat = filteredCategoryList.find(c => c.id === categoryId);
            if (cat) {
                setActiveCategory(cat);
                setDrawerOpen(true);
                setActiveSubcategory('all');
            }
        } else {
            setDrawerOpen(false);
            setTimeout(() => setActiveCategory(null), 300); // Delay for animation
        }
    };

    const subcategories = useMemo(() => {
        if (!activeCategory || !activeCategory.representative_spots) return [];
        const set = new Set<string>();
        activeCategory.representative_spots.forEach(spot => {
            if (spot.subcategory) set.add(spot.subcategory);
        });
        return Array.from(set);
    }, [activeCategory]);

    const filteredItems = useMemo(() => {
        if (!activeCategory) return [];
        let items = activeCategory.representative_spots || [];
        if (activeSubcategory !== 'all') {
            items = items.filter(spot => spot.subcategory === activeSubcategory);
        }
        return items;
    }, [activeCategory, activeSubcategory]);

    const categoryList = filteredCategoryList;

    return (
        <div className="flex flex-col gap-8 pb-10">

            {/* 1. LUTAGU Insight Hero (Redesigned: Compact & Data-Driven) */}
            <div className="group relative">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-md shadow-indigo-100">
                        <Star size={12} fill="currentColor" />
                    </div>
                    <h3 className="font-extrabold text-[10px] uppercase tracking-[0.2em] text-gray-400">{tL1('dnaTitle')}</h3>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-xl transition-all hover:shadow-indigo-500/10 group-hover:scale-[1.005] duration-500">
                    {/* Compact Animated Background */}
                    <div className="absolute inset-0 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-indigo-950" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50 mix-blend-overlay" />
                    <div className="absolute inset-0 backdrop-blur-[1px] bg-white/5" />

                    <div className="relative z-10 px-6 py-5 sm:px-8 sm:py-6">
                        <div className="flex flex-col gap-3">
                            {/* DNA Header - Compact */}
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-1 drop-shadow-sm flex items-center gap-2">
                                    {getLocaleString(title, locale)}
                                    {/* Optional: Add a small badge if needed */}
                                </h2>

                                {/* Dynamic Insight Tagline - Render ONLY if data exists */}
                                {(() => {
                                    const topCats = filteredCategoryList.slice(0, 2);
                                    let content = '';

                                    // Prioritize Wiki-derived Tagline
                                    const wikiTagline = getLocaleString(tagline, locale);

                                    if (wikiTagline) {
                                        content = wikiTagline;
                                    } else if (topCats.length >= 2) {
                                        if (locale === 'ja') content = `ここは${getCategoryLabel(topCats[0].id)}（${topCats[0].count}ヶ所）や${getCategoryLabel(topCats[1].id)}が充実したエリアです。`;
                                        else if (locale.startsWith('zh')) content = `這裡是以${getCategoryLabel(topCats[0].id)}（${topCats[0].count}處）與${getCategoryLabel(topCats[1].id)}聞名的區域。`;
                                        else content = `Known for ${getCategoryLabel(topCats[0].id)} (${topCats[0].count} spots) and ${getCategoryLabel(topCats[1].id)}.`;
                                    } else if (topCats.length === 1) {
                                        if (locale === 'ja') content = `${getCategoryLabel(topCats[0].id)}（${topCats[0].count}ヶ所）が中心のエリアです。`;
                                        else if (locale.startsWith('zh')) content = `以${getCategoryLabel(topCats[0].id)}（${topCats[0].count}處）為主的區域。`;
                                        else content = `Mainly featured by ${getCategoryLabel(topCats[0].id)} (${topCats[0].count} spots).`;
                                    } else {
                                        // This fallback is now redundant but kept for safety
                                        content = getLocaleString(tagline, locale);
                                    }

                                    if (!content) return null;

                                    return (
                                        <p className="text-indigo-200 font-medium text-xs sm:text-sm leading-relaxed max-w-full">
                                            {content}
                                        </p>
                                    );
                                })()}
                            </div>

                            {/* Vibe Tags - Compact Scrollable Row */}
                            {displayVibeTags && displayVibeTags.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-linear-fade">
                                    {displayVibeTags.map((tag: any, idx: number) => {
                                        const isActive = activeVibeFilter === tag.id;
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleVibeClick(tag.id)}
                                                className={`
                                                    shrink-0 group/tag relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all duration-300 touch-manipulation min-h-[36px]
                                                    ${isActive
                                                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
                                                        : 'bg-white/10 border-white/10 text-indigo-100 hover:bg-white/20'
                                                    }
                                                `}
                                            >
                                                <span className="text-[10px] font-bold">#{getLocaleString(tag.label, locale)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Exploration Categories (Drawer Triggers) */}
            <div className="px-1">
                <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} className="text-indigo-400" />
                        {tL1('nearbyHighlights')}
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {categoryList.reduce((acc, cat) => acc + cat.count, 0)} Spots
                    </span>
                </div>

                {placesLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-3xl" />)}
                    </div>
                ) : categoryList.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Search size={32} />
                        </div>
                        <p className="text-xs text-gray-400 font-bold">{tL1('noHighlights')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {categoryList.map((cat) => {
                            const style = CATEGORY_STYLE[cat.id] || CATEGORY_STYLE.default;
                            const Icon = style.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleDrawer(cat.id)}
                                    className={`group relative flex flex-col items-start p-5 rounded-[2rem] bg-white border ${style.borderColor} hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-[0.97] overflow-hidden touch-manipulation min-h-[120px]`}
                                >
                                    {/* Subtle Bg Icon */}
                                    <div className={`absolute -right-2 -bottom-2 opacity-[0.03] ${style.color}`}>
                                        <Icon size={80} />
                                    </div>

                                    <div className={`w-12 h-12 rounded-2xl ${style.bgColor} ${style.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <Icon size={24} strokeWidth={2.5} />
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-black text-gray-900">
                                            {getCategoryLabel(cat.id)}
                                        </span>
                                        <span className={`text-[10px] font-black ${style.color}`}>
                                            {cat.count}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center text-[10px] font-bold text-gray-400 group-hover:text-indigo-500 transition-colors">
                                        Explore <ChevronRight size={12} strokeWidth={3} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. Immersive Category Drawer */}
            {drawerOpen && activeCategory && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
                        onClick={() => toggleDrawer(null)}
                    />

                    {/* Drawer Content */}
                    <div className="relative bg-white w-full max-h-[85vh] rounded-t-[3rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-500 mx-auto max-w-lg overflow-hidden border-t border-white/20">
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-4 pb-2" onClick={() => toggleDrawer(null)}>
                            <div className="w-12 h-1.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors cursor-pointer" />
                        </div>

                        {/* Header Area */}
                        <div className="px-6 py-4">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl ${CATEGORY_STYLE[activeCategory.id]?.bgColor || 'bg-gray-100'} ${CATEGORY_STYLE[activeCategory.id]?.color || 'text-gray-900'} flex items-center justify-center shadow-lg shadow-black/5`}>
                                        {(() => {
                                            const Icon = CATEGORY_STYLE[activeCategory.id]?.icon || MapPin;
                                            return <Icon size={28} strokeWidth={2.5} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                            {getCategoryLabel(activeCategory.id)}
                                        </h3>
                                        <p className="text-xs font-bold text-gray-400 mt-0.5">
                                            {tL1('nearbyHighlights').replace('(300m)', '')} {activeCategory.count} {tTag('countSuffix')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleDrawer(null)}
                                    className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-90 transition-all border border-gray-100"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Subcategory Tabs */}
                            {subcategories.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                                    <button
                                        onClick={() => setActiveSubcategory('all')}
                                        className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black transition-all touch-manipulation min-h-[40px] ${activeSubcategory === 'all' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {tL1('menuTitle')}
                                    </button>
                                    {subcategories.map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => setActiveSubcategory(sub)}
                                            className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-black transition-all touch-manipulation min-h-[40px] ${activeSubcategory === sub ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {getSubcategoryLabel(sub)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-12 bg-gray-50/50 space-y-4">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item: L1Place, idx: number) => (
                                    <div
                                        key={item.osm_id || idx}
                                        className="animate-in fade-in slide-in-from-bottom duration-500"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <PlaceCard place={item} />
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center text-gray-400 font-bold text-sm">
                                    No spots match your filter.
                                </div>
                            )}
                            <div className="h-10" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
