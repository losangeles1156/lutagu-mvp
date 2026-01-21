'use client';

import { motion } from 'framer-motion';
import { Map as MapIcon, Clock } from 'lucide-react';

type L4Task = 'route' | 'time' | 'qa';

interface PlannerTabSelectorProps {
    activeTask: string;
    onSelect: (task: L4Task) => void;
    tL4: any;
}

export function PlannerTabSelector({ activeTask, onSelect, tL4 }: PlannerTabSelectorProps) {
    const tabs = [
        { id: 'route', label: tL4('plannerTabs.route'), icon: MapIcon },
        { id: 'time', label: tL4('plannerTabs.time'), icon: Clock },
    ];

    return (
        <div className="flex gap-1.5 p-1 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60">
            {tabs.map(tab => {
                const isActive = activeTask === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onSelect(tab.id as L4Task)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all relative overflow-hidden
                            ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTaskPill"
                                className="absolute inset-0 bg-white shadow-sm rounded-xl z-[-1]"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <Icon size={14} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
