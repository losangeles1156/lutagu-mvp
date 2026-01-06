'use client';

import { useState } from 'react';
import { Route, Clock, Info, Ticket, Cloud, Calendar, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useTranslations } from 'next-intl';

export interface IntentOption {
    id: string;
    icon: React.ElementType;
    label: string;
    color: string;
}

export function IntentSelector() {
    const t = useTranslations('chat.intent');
    const tCommon = useTranslations('common');

    const { selectedNeed, setSelectedNeed } = useAppStore();

    const intents: IntentOption[] = [
        { id: 'route', icon: Route, label: t('route'), color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        { id: 'status', icon: Clock, label: t('status'), color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { id: 'station_facility', icon: Info, label: t('facility'), color: 'bg-blue-100 text-blue-700 border-blue-200' },
        { id: 'ticket_tips', icon: Ticket, label: t('ticket'), color: 'bg-purple-100 text-purple-700 border-purple-200' },
        { id: 'weather', icon: Cloud, label: t('weather'), color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
        { id: 'time', icon: Calendar, label: t('time'), color: 'bg-rose-100 text-rose-700 border-rose-200' },
    ];

    const toggleIntent = (id: string) => {
        if (selectedNeed === id) {
            setSelectedNeed(null); // Deselect if already selected
        } else {
            setSelectedNeed(id);
        }

        // Haptic feedback
        if (window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 px-1 py-2">
            {intents.map((intent) => {
                const isActive = selectedNeed === intent.id;
                const Icon = intent.icon;
                return (
                    <button
                        key={intent.id}
                        onClick={() => toggleIntent(intent.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all active:scale-95
                            ${isActive
                                ? intent.color + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-current'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                            }
                        `}
                        title={tCommon('select') + ': ' + intent.label}
                    >
                        <Icon size={12} strokeWidth={3} className={isActive ? 'opacity-100' : 'opacity-50'} />
                        <span>{intent.label}</span>
                    </button>
                );
            })}

            {/* Clear button */}
            {selectedNeed && (
                <button
                    onClick={() => setSelectedNeed(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all active:scale-95"
                    title={tCommon('clear')}
                >
                    ✕
                </button>
            )}
        </div>
    );
}

export default IntentSelector;
