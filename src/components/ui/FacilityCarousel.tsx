'use client';

import { useRef } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface FacilityCarouselProps {
    title: string;
    facilities: any[];
}

export function FacilityCarousel({ title, facilities }: FacilityCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const tCommon = useTranslations('common');
    const tFacility = useTranslations('facilityProfile');

    if (!facilities || facilities.length === 0) return null;

    return (
        <div className="space-y-3 py-2">
            <div className="flex justify-between items-end px-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-600 rounded-full"></span>
                    {title}
                </h3>
                <button className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                    {tCommon('viewAll')} <ArrowRight size={14} />
                </button>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x scrollbar-hide -ml-2 pl-2"
            >
                {facilities.map((facility) => (
                    <div
                        key={facility.id}
                        className="min-w-[200px] bg-white rounded-2xl p-3 border border-black/[0.03] shadow-sm flex gap-3 snap-start"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative">
                            {/* Placeholder for actual image */}
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                🏪
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-1">
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{facility.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                <MapPin size={10} />
                                <span>{tCommon('distance')} {facility.distance}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {facility.tags?.map((tag: string) => (
                                    <span key={tag} className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-600 border border-gray-100">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
