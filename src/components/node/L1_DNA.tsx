'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lightbulb, Navigation, MapPin, ChevronRight, Clock, Star } from 'lucide-react';
import { VibeTags } from './VibeTags';

type Tag = {
    mainCategory: string;
    subCategory: string;
    detailCategory?: string;
    name: string;
    distanceMeters?: number;
    direction?: string;
    brand?: string;
    note?: string;
    street?: string;
};

// Expanded L1 main categories per user requirement
const MAIN_CAT_CONFIG: Record<string, { icon: string }> = {
    shopping: { icon: '🛍️' },
    dining: { icon: '🍽️' },
    medical: { icon: '🏥' },
    education: { icon: '🎓' },
    leisure: { icon: '🎡' },
    finance: { icon: '🏦' },
    accommodation: { icon: '🏨' },
    nature: { icon: '🌳' },
    religion: { icon: '⛩️' },
    business: { icon: '🏢' },
    culture: { icon: '🏛️' },
    service: { icon: '🛎️' }
};

const translatableCategories = ['shopping', 'dining', 'leisure', 'culture', 'service', 'medical', 'education', 'finance', 'accommodation', 'nature', 'religion', 'business'];

interface L1_DNAProps {
    nodeData: any;
    profile: any;
}

export function L1_DNA({ nodeData, profile }: L1_DNAProps) {
    const tTag = useTranslations('tag');
    const tFacility = useTranslations('facility');
    const tNode = useTranslations('node');

    // Group tags
    const tags: Tag[] = nodeData?.facilityTags || [];
    const grouped = tags.reduce((acc, tag) => {
        const main = tag.mainCategory;
        const sub = tag.subCategory;
        if (!acc[main]) acc[main] = {};
        if (!acc[main][sub]) acc[main][sub] = [];
        acc[main][sub].push(tag);
        return acc;
    }, {} as Record<string, Record<string, Tag[]>>);

    const [selectedMain, setSelectedMain] = useState<string | null>(Object.keys(grouped)[0] || null);
    const [expandedSub, setExpandedSub] = useState<string | null>(null);

    // Helper to get total count for a main category
    const getMainCount = (main: string) => {
        return Object.values(grouped[main] || {}).flat().length;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            {/* 1. Header & AI Summary */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                        <Star size={16} fill="currentColor" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">{tNode('locationDna')}</h3>
                </div>

                {/* AI One-Liner */}
                <div className="mb-6 p-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Lightbulb size={48} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">Bambi AI Insight</h4>
                        <p className="text-sm font-bold text-gray-800 italic leading-relaxed font-serif">
                            &quot;{nodeData?.vibe ? nodeData.vibe : 'Analyzing local atmosphere...'}&quot; : A unique blend of tradition and modernity.
                        </p>
                    </div>
                </div>

                <VibeTags tags={profile.vibe_tags} />
            </div>

            {/* 2. Main Categories (Horizontal Scroll) */}
            <div className="relative -mx-4 px-4 overflow-hidden">
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                    {Object.keys(grouped).map((mainCat) => {
                        const config = MAIN_CAT_CONFIG[mainCat] || { icon: '📍' };
                        const label = translatableCategories.includes(mainCat) ? tTag(mainCat) : mainCat;
                        const count = getMainCount(mainCat);
                        const isSelected = selectedMain === mainCat;

                        return (
                            <button
                                key={mainCat}
                                onClick={() => {
                                    setSelectedMain(mainCat);
                                    setExpandedSub(null); // Reset sub selection
                                }}
                                className={`flex-shrink-0 snap-start flex flex-col items-center gap-2 p-3 min-w-[80px] rounded-2xl border transition-all duration-300 ${isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200 hover:bg-indigo-50'
                                    }`}
                            >
                                <span className="text-2xl filter drop-shadow-sm">{config.icon}</span>
                                <div className="text-center">
                                    <span className={`text-[10px] font-black uppercase tracking-tight block ${isSelected ? 'text-white' : 'text-gray-900'}`}>{label}</span>
                                    <span className={`text-[9px] font-medium block mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>{count}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                {/* Fade effect */}
                <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>

            {/* 3. Sub Categories & Items */}
            {selectedMain && grouped[selectedMain] && (
                <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Detailed List</span>
                        <div className="h-px bg-gray-100 flex-1" />
                    </div>

                    {Object.entries(grouped[selectedMain]).map(([subCat, items]) => {
                        const isExpanded = expandedSub === subCat;
                        const subLabel = tTag.has(`sub.${subCat}`) ? tTag(`sub.${subCat}`) : subCat;

                        return (
                            <div key={subCat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                                <button
                                    onClick={() => setExpandedSub(isExpanded ? null : subCat)}
                                    className={`w-full flex items-center justify-between p-4 ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-100/50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <MapPin size={16} />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-sm font-bold text-gray-800 capitalize block">{subLabel}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{items.length}</span>
                                        <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                </button>

                                {/* Items List */}
                                {isExpanded && (
                                    <div className="divide-y divide-gray-50 border-t border-gray-50">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="p-4 bg-white hover:bg-gray-50/50 transition-colors flex gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-sm font-bold text-gray-900 mb-1 truncate">{item.name || item.brand}</h5>
                                                    <div className="text-[11px] text-gray-500 flex flex-col gap-0.5">
                                                        <span className="font-medium text-indigo-500">{item.direction || 'In station'}</span>
                                                        {item.distanceMeters && (
                                                            <span>Approx. {Math.ceil(item.distanceMeters / 80)} min walk ({item.distanceMeters}m)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button className="self-center p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shrink-0">
                                                    <Navigation size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
