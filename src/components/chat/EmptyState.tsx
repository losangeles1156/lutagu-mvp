'use client';

import { Sparkles, Compass, Clock, Accessibility } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

interface EmptyStateProps {
    onSend: (text: string) => void;
}

export function EmptyState({ onSend }: EmptyStateProps) {
    const locale = useLocale();
    const t = useTranslations('chat');

    const quickQuestions = [
        {
            icon: Clock,
            text: t('quickQuestions.status.text'),
            label: t('quickQuestions.status.label')
        },
        {
            icon: Accessibility,
            text: t('quickQuestions.accessibility.text'),
            label: t('quickQuestions.accessibility.label')
        },
        {
            icon: Compass,
            text: t('quickQuestions.route.text'),
            label: t('quickQuestions.route.label')
        }
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
                <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">{t('emptyTitle')}</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-[240px]">{t('emptyDescription')}</p>

            <div className="w-full max-w-[280px] space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">{t('quickQuestionsTitle')}</p>
                {quickQuestions.map((q, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSend(q.text)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl transition-all group active:scale-[0.98] text-left"
                    >
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                            <q.icon size={16} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-700">{q.text}</p>
                            <p className="text-[10px] text-slate-400">{q.label}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default EmptyState;
