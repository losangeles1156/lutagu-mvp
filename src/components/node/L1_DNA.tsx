'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    MapPin, Navigation, X, Star, Lightbulb,
    Coffee, ShoppingBag, Landmark, Utensils, Bed, Building, TreePine,
    Stethoscope, Briefcase, ConciergeBell, GraduationCap
} from 'lucide-react';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';

// Icon Mapping
const ICON_MAP: Record<string, any> = {
    nature: TreePine,
    shopping: ShoppingBag,
    dining: Utensils,
    leisure: Coffee,
    culture: Landmark,
    service: ConciergeBell,
    medical: Stethoscope,
    education: GraduationCap,
    finance: Briefcase,
    accommodation: Bed,
    // Fallbacks
    Cross: Stethoscope,
    Building: Building
};

interface L1_DNAProps {
    data: StationUIProfile;
}

export function L1_DNA({ data }: L1_DNAProps) {
    const tL1 = useTranslations('l1');
    const locale = useLocale();
    // Destructure new l1_dna object, fallback to empty structure
    const { l1_dna, description = { ja: '', en: '', zh: '' } } = data || {};
    const { categories = {}, vibe_tags = [] } = l1_dna || {};

    // Get categories as array for mapping
    const categoryList = Object.values(categories);

    // State for expanded category
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

    const selectedCategory = selectedCatId ? categories[selectedCatId] : null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">

            {/* 1. Header & AI Vibe Check */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                        <Star size={16} fill="currentColor" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">{tL1('dnaTitle')}</h3>
                </div>

                <div className="p-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Lightbulb size={48} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">{tL1('bambiInsight')}</h4>
                        <p className="text-sm font-bold text-gray-800 italic leading-relaxed font-serif">
                            &quot;{getLocaleString(description, locale)}&quot;
                        </p>
                        {/* Vibe Tags Display */}
                        {vibe_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {vibe_tags.map(tag => (
                                    <span key={tag.id} className="text-[10px] bg-white/80 border border-indigo-100 px-2 py-1 rounded-full text-indigo-600 font-bold shadow-sm">
                                        #{getLocaleString(tag.label, locale)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Categories Grid (Strictly 10 items) */}
            <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">{tL1('nearbyHighlights')}</h4>

                {categoryList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        {tL1('noHighlights')}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                        {categoryList.slice(0, 10).map((cat) => {
                            // Use ID for reliable icon mapping
                            const Icon = ICON_MAP[cat.id] || MapPin;
                            const isSelected = selectedCatId === cat.id;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCatId(isSelected ? null : cat.id)}
                                    className={`flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-300 group ${isSelected
                                        ? 'scale-105'
                                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                        : 'bg-white border-gray-200 text-gray-400 group-hover:border-indigo-200 group-hover:text-indigo-500 relative'
                                        }`}>
                                        <Icon size={18} strokeWidth={2.5} />
                                        {/* Count Badge */}
                                        <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                            {cat.count > 99 ? '99+' : cat.count}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold truncate max-w-full tracking-tight ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                        {getLocaleString(cat.label, locale)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. Detailed Sub-menu (Drawer-like) */}
            {selectedCategory && (
                <div className="animate-in fade-in zoom-in duration-300 origin-top pt-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden ring-1 ring-black/5">
                        {/* Header */}
                        <div className="bg-gray-50/80 backdrop-blur-sm p-3 flex items-center justify-between border-b border-gray-100">
                            <h5 className="font-bold text-gray-900 flex items-center gap-2">
                                {getLocaleString(selectedCategory.label, locale)}
                                <span className="bg-gray-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                    {selectedCategory.representative_spots?.length || 0}
                                </span>
                            </h5>
                            <button
                                onClick={() => setSelectedCatId(null)}
                                className="p-1 hover:bg-gray-200 rounded-full text-gray-400"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Items List (Representative Spots) */}
                        <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 bg-white">
                            {(selectedCategory.representative_spots || []).map((item, idx) => (
                                <div key={item.osm_id || idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 group/item">
                                    <div className="mt-1 p-1.5 bg-gray-100 text-gray-400 rounded-lg group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                                        <MapPin size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h6 className="text-sm font-bold text-gray-900 leading-tight mb-0.5 truncate">
                                            {getLocaleString(item.name, locale)}
                                        </h6>
                                        {/* Since location is removed, we show a generic text or subcategory if available */}
                                        <p className="text-xs text-gray-500 font-medium">
                                            Nearby Spot
                                        </p>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocaleString(item.name, locale))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-0.5 p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex-shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Navigation size={14} fill="currentColor" />
                                    </a>
                                </div>
                            ))}
                            {(!selectedCategory.representative_spots || selectedCategory.representative_spots.length === 0) && (
                                <div className="p-4 text-center text-xs text-gray-400">
                                    {tL1('noSpots')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
