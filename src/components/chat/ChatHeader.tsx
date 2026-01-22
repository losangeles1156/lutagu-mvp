'use client';

import { memo } from 'react';
import { RotateCcw, Minus, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslations } from 'next-intl';

interface ChatHeaderProps {
    isDemoMode: boolean;
    onRestart: () => void;
    onMinimize: () => void;
    onClose: () => void;
}

export const ChatHeader = memo(({ isDemoMode, onRestart, onMinimize, onClose }: ChatHeaderProps) => {
    return (
        <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
                        ✨
                    </div>
                    <div className="font-black text-sm text-slate-900">LUTAGU AI {isDemoMode ? '(Demo)' : ''}</div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <LanguageSwitcher className="p-2 shadow-none glass-effect-none bg-transparent hover:bg-indigo-50 rounded-lg" />
                <button
                    onClick={onRestart}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    aria-label="Restart Chat"
                >
                    <RotateCcw size={16} />
                </button>
                <button
                    onClick={onMinimize}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    aria-label="Minimize Chat"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    aria-label="Close Chat"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
});

ChatHeader.displayName = 'ChatHeader';
