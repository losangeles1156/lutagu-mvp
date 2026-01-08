'use client';

import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { L4DemandState, SupportedLocale } from '@/lib/l4/assistantEngine';

type SimplifiedDemand = 'optimalRoute' | 'saveMoney' | 'accessibility' | 'expertTips' | 'avoidCrowds' | 'fastTrack';

interface L4DemandChipsProps {
    demand: L4DemandState;
    setDemand: React.Dispatch<React.SetStateAction<L4DemandState>>;
    wantsExpertTips: boolean;
    setWantsExpertTips: React.Dispatch<React.SetStateAction<boolean>>;
    task: 'route' | 'time' | 'qa';
    locale: SupportedLocale;
    isCompact?: boolean;
}

export function L4DemandChips({
    demand,
    setDemand,
    wantsExpertTips,
    setWantsExpertTips,
    task,
    locale,
    isCompact
}: L4DemandChipsProps) {
    const isSimplifiedDemandActive = (key: SimplifiedDemand) => {
        if (key === 'expertTips') return wantsExpertTips;

        const mapping: Record<Exclude<SimplifiedDemand, 'expertTips'>, (keyof L4DemandState)[]> = {
            optimalRoute: ['comfort'],
            saveMoney: ['budget'],
            accessibility: ['wheelchair', 'stroller', 'senior'],
            avoidCrowds: ['avoidCrowds'],
            fastTrack: ['rushing'],
        };
        const keys = mapping[key];
        return keys.every(k => demand[k]);
    };

    const toggleSimplifiedDemand = (key: SimplifiedDemand) => {
        if (key === 'expertTips') {
            setWantsExpertTips(prev => !prev);
            return;
        }

        const mapping: Record<Exclude<SimplifiedDemand, 'expertTips'>, (keyof L4DemandState)[]> = {
            optimalRoute: ['comfort'],
            saveMoney: ['budget'],
            accessibility: ['wheelchair', 'stroller', 'senior'],
            avoidCrowds: ['avoidCrowds'],
            fastTrack: ['rushing'],
        };

        const keys = mapping[key];
        const isActive = keys.every(k => demand[k]);
        setDemand(prev => {
            const next = { ...prev };
            keys.forEach(k => {
                next[k] = !isActive;
            });
            return next;
        });
    };

    const chips = useMemo(() => {
        const all: { key: SimplifiedDemand; icon: string; label: string }[] = [
            {
                key: 'fastTrack',
                icon: '⚡',
                label: locale.startsWith('zh') ? '趕時間' : locale === 'ja' ? '時間優先' : 'Fast Track'
            },
            {
                key: 'accessibility',
                icon: '🛗',
                label: locale.startsWith('zh') ? '無障礙' : locale === 'ja' ? 'バリアフリー' : 'Accessible'
            },
            {
                key: 'saveMoney',
                icon: '💰',
                label: locale.startsWith('zh') ? '省錢' : locale === 'ja' ? '料金重視' : 'Budget'
            },
            {
                key: 'avoidCrowds',
                icon: '🧘',
                label: locale.startsWith('zh') ? '避開擁擠' : locale === 'ja' ? '混雑回避' : 'Quiet'
            },
            {
                key: 'optimalRoute',
                icon: '🛋️',
                label: locale.startsWith('zh') ? '舒適' : locale === 'ja' ? '快適優先' : 'Comfort'
            },
            {
                key: 'expertTips',
                icon: '💡',
                label: locale.startsWith('zh') ? '專家建議' : locale === 'ja' ? '裏技' : 'Tips'
            }
        ];

        return all;
    }, [locale]);

    if (task !== 'route') return null;

    return (
        <div className="space-y-3">
            <div className={`grid grid-cols-3 ${isCompact ? 'gap-2' : 'gap-3'}`}>
                {chips.map(chip => (
                    <SimplifiedDemandChip
                        key={chip.key}
                        icon={chip.icon}
                        label={chip.label}
                        active={isSimplifiedDemandActive(chip.key)}
                        onClick={() => toggleSimplifiedDemand(chip.key)}
                        isCompact={isCompact}
                    />
                ))}
            </div>
        </div>
    );
}

interface SimplifiedDemandChipProps {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
    isCompact?: boolean;
}

function SimplifiedDemandChip({ icon, label, active, onClick, isCompact }: SimplifiedDemandChipProps) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all active:scale-[0.96] touch-manipulation relative overflow-hidden ${isCompact ? 'p-2 min-h-[50px]' : 'p-3 min-h-[70px]'} ${active
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200/50'
                : 'bg-white/50 backdrop-blur-sm border-slate-200/60 text-slate-600 hover:bg-white hover:border-slate-300'
                }`}
        >
            {active && (
                <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 -z-10"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            )}
            <span className={isCompact ? 'text-lg' : 'text-xl'}>{icon}</span>
            <span className={`font-black tracking-tight ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
        </button>
    );
}
