'use client';

import { motion } from 'framer-motion';
import { Sparkles, Map as MapIcon, MessageCircle } from 'lucide-react';

type L4ViewMode = 'recommendations' | 'planner' | 'chat';

interface ViewModeSelectorProps {
    activeMode: L4ViewMode;
    onSelect: (mode: L4ViewMode) => void;
    tL4: any;
    isCompact?: boolean;
}

export function ViewModeSelector({ activeMode, onSelect, tL4, isCompact }: ViewModeSelectorProps) {
    const modes = [
        { id: 'recommendations', label: tL4('viewModes.recommendations'), icon: Sparkles },
        { id: 'planner', label: tL4('viewModes.planner'), icon: MapIcon },
        { id: 'chat', label: tL4('viewModes.chat'), icon: MessageCircle },
    ];

    return (
        <div className={`relative flex p-1 bg-white/40 backdrop-blur-xl rounded-[1.25rem] border border-white/60 shadow-lg shadow-slate-200/20 transition-all ${isCompact ? 'gap-0.5' : 'gap-1'}`}>
            {modes.map(mode => {
                const isActive = activeMode === mode.id;
                const Icon = mode.icon;
                return (
                    <button
                        key={mode.id}
                        onClick={() => onSelect(mode.id as L4ViewMode)}
                        className={`
                            relative flex-1 flex items-center justify-center gap-1.5 rounded-[0.9rem] text-xs font-black transition-all active:scale-95 touch-manipulation z-10
                            ${isCompact ? 'py-2 px-1' : 'py-3'}
                            ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeModePill"
                                className="absolute inset-0 bg-white shadow-md shadow-indigo-100/50 rounded-[0.9rem] z-[-1]"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <Icon size={isCompact ? 14 : 16} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />
                        <span className={isCompact ? 'hidden xs:inline' : ''}>{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
