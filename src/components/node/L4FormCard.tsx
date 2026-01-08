'use client';

import { StationAutocomplete } from '@/components/ui/StationAutocomplete';
import type { Station } from '@/types/station';
import { ArrowRightLeft, MapPin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';

interface L4FormCardProps {
    originInput: string;
    setOriginInput: (v: string) => void;
    selectedOrigin: Station | null;
    setSelectedOrigin: (s: Station | null) => void;
    destinationInput: string;
    setDestinationInput: (v: string) => void;
    selectedDestination: Station | null;
    setSelectedDestination: (s: Station | null) => void;
    swapStations: () => void;
    task: 'route' | 'time' | 'qa';
    isLoading: boolean;
    getStationDisplayName: (s: Station) => string;
    locale: SupportedLocale;
    isCompact?: boolean;
    directions?: string[];
    selectedDirection?: string | null;
    onDirectionChange?: (dir: string | null) => void;
    getLocalizedStationName?: (id: string, locale: string) => string;
}

export function L4FormCard({
    originInput,
    setOriginInput,
    selectedOrigin,
    setSelectedOrigin,
    destinationInput,
    setDestinationInput,
    selectedDestination,
    setSelectedDestination,
    swapStations,
    task,
    isLoading,
    getStationDisplayName,
    locale,
    isCompact,
    directions = [],
    selectedDirection = null,
    onDirectionChange,
    getLocalizedStationName
}: L4FormCardProps) {

    if (task === 'qa') return null;

    return (
        <motion.div layout className={`bg-white/60 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/20 border border-white/60 relative overflow-hidden transition-all ${isCompact ? 'p-3' : 'p-5'}`}>
            <div className={`relative z-10 ${isCompact ? 'space-y-3' : 'space-y-5'}`}>
                {/* Station Inputs */}
                <div className="relative">
                    {/* Connector Line */}
                    {task === 'route' && (
                        <div className={`absolute left-3.5 w-0.5 bg-slate-200/50 rounded-full ${isCompact ? 'top-6 bottom-6' : 'top-8 bottom-8'}`} />
                    )}

                    <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
                        {/* Origin / Current Station */}
                        <div className="relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                <div className={`rounded-full bg-emerald-500 ring-4 ring-white/80 shadow-sm ${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                            </div>
                            
                            {task === 'time' ? (
                                <div className={`pl-9 flex items-center justify-between bg-white/50 border border-slate-100/50 rounded-2xl transition-all ${isCompact ? 'h-10' : 'h-14'}`}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <MapPin size={isCompact ? 14 : 16} className="text-emerald-500 shrink-0" />
                                        <span className={`font-black text-slate-800 truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                                            {selectedOrigin ? getStationDisplayName(selectedOrigin) : originInput}
                                        </span>
                                    </div>
                                    <div className="px-3 shrink-0">
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-full uppercase tracking-wider">
                                            {locale.startsWith('zh') ? '目前站點' : locale === 'ja' ? '現在の駅' : 'Current'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <StationAutocomplete
                                    value={originInput}
                                    onChange={(v) => {
                                        setOriginInput(v);
                                        setSelectedOrigin(null);
                                    }}
                                    onSelect={(s) => {
                                        setSelectedOrigin(s);
                                        setOriginInput(getStationDisplayName(s));
                                    }}
                                    placeholder={locale === 'ar' ? 'من أين؟' : locale.startsWith('zh') ? '出發車站' : locale === 'ja' ? '出発駅' : 'Origin'}
                                    className={`pl-9 font-bold bg-white/50 border-slate-100/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-2xl transition-all touch-manipulation ${isCompact ? 'h-10 text-sm' : 'h-14 text-base'}`}
                                    locale={locale as 'zh-TW' | 'ja' | 'en' | 'ar'}
                                    disabled={isLoading}
                                />
                            )}
                        </div>

                        {/* Direction Selector (Time mode only) */}
                        {task === 'time' && directions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative"
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                    <div className={`rounded-full bg-indigo-500 ring-4 ring-white/80 shadow-sm ${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={selectedDirection || ''}
                                        onChange={(e) => onDirectionChange?.(e.target.value || null)}
                                        className={`w-full pl-9 pr-10 font-bold bg-white/50 border border-slate-100/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-2xl transition-all appearance-none touch-manipulation ${isCompact ? 'h-10 text-sm' : 'h-14 text-base'}`}
                                    >
                                        <option value="">{locale.startsWith('zh') ? '所有方向' : locale === 'ja' ? 'すべての方向' : 'All Directions'}</option>
                                        {directions.map(dir => (
                                            <option key={dir} value={dir}>
                                                {(locale.startsWith('zh') ? '往 ' : locale === 'ja' ? '方面 ' : 'To ') + (getLocalizedStationName ? getLocalizedStationName(dir, locale) : dir.split(/[:.]/).pop())}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={isCompact ? 16 : 18} />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Destination (Route mode only) */}
                        {task === 'route' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative"
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                    <div className={`rounded-full bg-indigo-500 ring-4 ring-white/80 shadow-sm ${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                                </div>
                                <StationAutocomplete
                                    value={destinationInput}
                                    onChange={(v) => {
                                        setDestinationInput(v);
                                        setSelectedDestination(null);
                                    }}
                                    onSelect={(s) => {
                                        setSelectedDestination(s);
                                        setDestinationInput(getStationDisplayName(s));
                                    }}
                                    placeholder={locale === 'ar' ? 'إلى أين؟' : locale.startsWith('zh') ? '抵達目的地車站' : locale === 'ja' ? '到着駅' : 'Destination'}
                                    className={`pl-9 font-bold bg-white/50 border-slate-100/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-2xl transition-all touch-manipulation ${isCompact ? 'h-10 text-sm' : 'h-14 text-base'}`}
                                    locale={locale as 'zh-TW' | 'ja' | 'en' | 'ar'}
                                    disabled={isLoading}
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Swap Button */}
                    {task === 'route' && (
                        <button
                            onClick={swapStations}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur shadow-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-90 transition-all z-20 touch-manipulation flex items-center justify-center ${isCompact ? 'p-2 min-w-[32px] min-h-[32px]' : 'p-3 min-w-[44px] min-h-[44px]'}`}
                        >
                            <ArrowRightLeft size={isCompact ? 14 : 16} className="rotate-90" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
