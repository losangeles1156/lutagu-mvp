'use client';

import { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { L4DemandState } from '@/lib/l4/assistantEngine';

type SimplifiedDemand = 'optimalRoute' | 'saveMoney' | 'accessibility' | 'expertTips' | 'avoidCrowds' | 'fastTrack';

interface L4DemandChipsProps {
    demand: L4DemandState;
    setDemand: React.Dispatch<React.SetStateAction<L4DemandState>>;
    wantsExpertTips: boolean;
    setWantsExpertTips: React.Dispatch<React.SetStateAction<boolean>>;
    task: 'route' | 'knowledge' | 'timetable';
    locale: 'zh-TW' | 'ja' | 'en';
}

export function L4DemandChips({
    demand,
    setDemand,
    wantsExpertTips,
    setWantsExpertTips,
    task,
    locale
}: L4DemandChipsProps) {
    const isDemandOpen = useMemo(() => {
        // 檢查是否有隱藏的 chips
        const hiddenKeys: SimplifiedDemand[] = ['optimalRoute', 'expertTips'];
        return hiddenKeys.some(key => isSimplifiedDemandActive(key));
    }, [demand, wantsExpertTips]);

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

    const chips = useMemo(() => {
        const all: { key: SimplifiedDemand; icon: string; label: string }[] = [
            {
                key: 'accessibility',
                icon: '🛗',
                label: locale.startsWith('zh')
                    ? '無障礙/親子'
                    : locale === 'ja'
                        ? 'バリアフリー/子連れ'
                        : 'Accessibility & Kids'
            },
            {
                key: 'fastTrack',
                icon: '⚡',
                label: locale.startsWith('zh')
                    ? '趕時間'
                    : locale === 'ja'
                        ? '時間優先'
                        : 'In a Hurry'
            },
            {
                key: 'saveMoney',
                icon: '💰',
                label: locale.startsWith('zh')
                    ? '省錢優先'
                    : locale === 'ja'
                        ? '料金重視'
                        : 'Save Money'
            },
            {
                key: 'avoidCrowds',
                icon: '🚶',
                label: locale.startsWith('zh')
                    ? '避開人潮'
                    : locale === 'ja'
                        ? '混雑回避'
                        : 'Avoid Crowds'
            },
            {
                key: 'optimalRoute',
                icon: '✨',
                label: locale.startsWith('zh') ? '優化' : locale === 'ja' ? '最適' : 'Optimal'
            },
            {
                key: 'expertTips',
                icon: '💡',
                label: locale.startsWith('zh') ? '專家建議' : locale === 'ja' ? 'プロのコツ' : 'Expert Tips'
            }
        ];

        if (task === 'timetable') {
            return all.filter(c => ['accessibility', 'avoidCrowds', 'expertTips'].includes(c.key));
        }
        return all;
    }, [task, locale]);

    const visibleChips = chips.slice(0, 4);
    const hiddenChips = chips.slice(4);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {locale.startsWith('zh') ? '偏好設定' : locale === 'ja' ? '設定' : 'Preferences'}
                </label>
                {hiddenChips.length > 0 && (
                    <button
                        onClick={() => {}} // Toggle logic handled by parent
                        className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                    >
                        {locale.startsWith('zh') ? '更多選項' : locale === 'ja' ? '詳細' : 'More'}
                        <Settings size={12} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {visibleChips.map(chip => (
                    <SimplifiedDemandChip
                        key={chip.key}
                        icon={chip.icon}
                        label={chip.label}
                        active={isSimplifiedDemandActive(chip.key)}
                        onClick={() => toggleSimplifiedDemand(chip.key)}
                    />
                ))}
            </div>

            <AnimatePresence>
                {isDemandOpen && hiddenChips.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 grid grid-cols-3 gap-2 border-t border-slate-50 mt-3">
                            {hiddenChips.map(chip => (
                                <SimplifiedDemandChip
                                    key={chip.key}
                                    icon={chip.icon}
                                    label={chip.label}
                                    active={isSimplifiedDemandActive(chip.key)}
                                    onClick={() => toggleSimplifiedDemand(chip.key)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface SimplifiedDemandChipProps {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

function SimplifiedDemandChip({ icon, label, active, onClick }: SimplifiedDemandChipProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all ${active
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'
                }`}
        >
            <span className="text-base">{icon}</span>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}
