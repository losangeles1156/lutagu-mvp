'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { StationAutocomplete } from '@/components/ui/StationAutocomplete';
import type { Station } from '@/types/station';
import { ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

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
    task: 'route' | 'knowledge' | 'timetable';
    isLoading: boolean;
    getStationDisplayName: (s: Station) => string;
    locale: 'zh-TW' | 'ja' | 'en';
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
    locale
}: L4FormCardProps) {

    return (
        <motion.div layout className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 relative overflow-hidden">
            {/* Decorative background blob */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="relative z-10 space-y-5">
                {/* Station Inputs */}
                <div className="relative">
                    {/* Connector Line */}
                    {task === 'route' && (
                        <div className="absolute left-3.5 top-8 bottom-8 w-0.5 bg-slate-100 rounded-full" />
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-sm" />
                            </div>
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
                                placeholder={
                                    task === 'timetable'
                                        ? (locale.startsWith('zh') ? '選擇車站' : locale === 'ja' ? '駅を選択' : 'Select Station')
                                        : (locale.startsWith('zh') ? '從哪裡出發？' : locale === 'ja' ? 'どこから出発？' : 'Origin')
                                }
                                className="pl-9 h-14 text-base font-bold bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all touch-manipulation"
                                locale={locale as 'zh-TW' | 'ja' | 'en'}
                                disabled={isLoading}
                            />
                        </div>

                        {task === 'route' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative"
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 flex justify-center z-10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm" />
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
                                    placeholder={locale.startsWith('zh') ? '想去哪裡？' : locale === 'ja' ? 'どこへ行く？' : 'Destination'}
                                    className="pl-9 h-14 text-base font-bold bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all touch-manipulation"
                                    locale={locale as 'zh-TW' | 'ja' | 'en'}
                                    disabled={isLoading}
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Swap Button */}
                    {task === 'route' && (
                        <button
                            onClick={swapStations}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-90 transition-all z-20 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <ArrowRightLeft size={16} className="rotate-90" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
