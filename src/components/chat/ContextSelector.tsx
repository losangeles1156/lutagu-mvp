'use client';

import { useState } from 'react';
import { Briefcase, Baby, UserMinus, Clock } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useTranslations } from 'next-intl';

export interface UserContext {
    id: string;
    icon: React.ElementType;
    label: string;
    color: string;
}

export function ContextSelector() {
    // In a real app, these would come from translations
    // keeping hardcoded for MVP speed as requested
    const contexts: UserContext[] = [
        { id: 'luggage', icon: Briefcase, label: '大型行李', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        { id: 'stroller', icon: Baby, label: '推嬰兒車', color: 'bg-rose-100 text-rose-700 border-rose-200' },
        { id: 'accessibility', icon: UserMinus, label: '行動不便', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        { id: 'rush', icon: Clock, label: '趕時間', color: 'bg-amber-100 text-amber-700 border-amber-200' }
    ];

    const { userContext, setUserContext } = useAppStore();

    const toggleContext = (id: string) => {
        const current = userContext || [];
        const isAdding = !current.includes(id);
        
        if (current.includes(id)) {
            setUserContext(current.filter(c => c !== id));
        } else {
            setUserContext([...current, id]);
        }

        // Haptic feedback (if available)
        if (window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    };

    return (
        <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-hide mask-fade-right">
            {contexts.map((ctx) => {
                const isActive = (userContext || []).includes(ctx.id);
                const Icon = ctx.icon;
                return (
                    <button
                        key={ctx.id}
                        onClick={() => toggleContext(ctx.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all active:scale-95 whitespace-nowrap
                            ${isActive
                                ? ctx.color + ' shadow-sm scale-105 ring-2 ring-offset-1 ring-current'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                    >
                        <Icon size={12} strokeWidth={3} className={isActive ? 'opacity-100' : 'opacity-50'} />
                        <span>{ctx.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
