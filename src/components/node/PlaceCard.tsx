import { Navigation, MapPin, Utensils, Store, Landmark, Coffee, TreePine, Hospital, Building2, Landmark as CultureIcon, Briefcase, Bed, Info } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { L1Place } from '@/hooks/useL1Places';
import { useCategoryTranslation } from '@/hooks/useCategoryTranslation';
import { getLocaleString } from '@/lib/utils/localeUtils';

interface PlaceCardProps {
    place: L1Place;
    isFeatured?: boolean;
}

// Enhanced Icon Map with Colors
const CATEGORY_STYLE: Record<string, { icon: any; color: string; bgColor: string }> = {
    dining: { icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    shopping: { icon: Store, color: 'text-pink-600', bgColor: 'bg-pink-50' },
    culture: { icon: CultureIcon, color: 'text-blue-700', bgColor: 'bg-blue-50' },
    leisure: { icon: Coffee, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    nature: { icon: TreePine, color: 'text-green-700', bgColor: 'bg-green-50' },
    medical: { icon: Hospital, color: 'text-red-600', bgColor: 'bg-red-50' },
    business: { icon: Building2, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    service: { icon: Landmark, color: 'text-slate-600', bgColor: 'bg-slate-50' },
    finance: { icon: Briefcase, color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
    accommodation: { icon: Bed, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    default: { icon: MapPin, color: 'text-gray-500', bgColor: 'bg-gray-100' }
};

export function PlaceCard({ place, isFeatured = false }: PlaceCardProps) {
    const locale = useLocale();
    const { getCategoryLabel, getSubcategoryLabel } = useCategoryTranslation();
    const style = CATEGORY_STYLE[place.category] || CATEGORY_STYLE.default;
    const Icon = style.icon;
    const name = getLocaleString(place.name_i18n as any, locale) || place.name;

    // Walking time calculation (Standard: 80m/min)
    const walkMinutes = place.distance_meters ? Math.ceil(place.distance_meters / 80) : null;

    const handleNavClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (place.navigation_url) {
            window.open(place.navigation_url, '_blank', 'noopener,noreferrer');
        } else {
            // Fallback
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className={`p-4 rounded-2xl border transition-all hover:shadow-md flex items-center gap-4 group bg-white ${isFeatured ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'}`}>
            {/* Icon Box */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bgColor} ${style.color} transition-transform group-hover:scale-105`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-extrabold text-[15px] text-gray-900 truncate tracking-tight">
                        {name}
                    </h4>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Subcategory Badge */}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${style.bgColor} ${style.color} uppercase tracking-wider`}>
                        {place.subcategory
                            ? getSubcategoryLabel(place.subcategory)
                            : getCategoryLabel(place.category)}
                    </span>

                    {/* Distance/Time */}
                    {walkMinutes !== null && (
                        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                            • {walkMinutes} min ({place.distance_meters}m)
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation Action */}
            <button
                onClick={handleNavClick}
                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center active:scale-90 border border-gray-100"
                title="Navigate"
            >
                <Navigation size={18} fill="currentColor" />
            </button>
        </div>
    );
}
