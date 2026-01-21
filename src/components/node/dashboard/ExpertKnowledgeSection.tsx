'use client';

import { Lightbulb } from 'lucide-react';
import { getLocaleString } from '@/lib/utils/localeUtils';
import type { L4Knowledge } from '@/lib/types/stationStandard';

interface ExpertKnowledgeSectionProps {
    l4Knowledge?: L4Knowledge;
    knowledgeFilter: 'all' | 'traps' | 'hacks';
    uiLocale: string;
    t: any;
}

export function ExpertKnowledgeSection({ l4Knowledge, knowledgeFilter, uiLocale, t }: ExpertKnowledgeSectionProps) {
    return (
        <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-slate-200/60 shadow-xl shadow-slate-200/20 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    {t('ridingGuide')}
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">{t('expertMode')}</span>
            </div>

            <div className="space-y-4">
                {(knowledgeFilter === 'all' || knowledgeFilter === 'traps') && l4Knowledge?.traps?.map((item, i) => (
                    <div key={`trap-${i}`} className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 flex gap-4 group hover:bg-red-50 transition-colors">
                        <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">{getLocaleString(item.icon, uiLocale) || '⚠️'}</div>
                        <div>
                            <div className="font-black text-red-900 text-sm mb-1">{getLocaleString(item.title, uiLocale).replace(/\*\*/g, '')}</div>
                            <div className="text-xs font-bold text-red-700/80 leading-relaxed">{getLocaleString(item.description, uiLocale).replace(/\*\*/g, '')}</div>
                            {item.advice && (
                                <div className="mt-3 p-2.5 bg-white/80 rounded-xl text-[11px] font-bold text-red-800 flex items-start gap-2 shadow-sm ring-1 ring-red-100">
                                    <Lightbulb size={14} className="shrink-0 text-amber-500 mt-0.5" />
                                    <span>{getLocaleString(item.advice, uiLocale).replace(/\*\*/g, '')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {(knowledgeFilter === 'all' || knowledgeFilter === 'hacks') && l4Knowledge?.hacks?.map((item, i) => (
                    <div key={`hack-${i}`} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex gap-4 group hover:bg-emerald-50 transition-colors">
                        <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">{getLocaleString(item.icon, uiLocale) || '💡'}</div>
                        <div>
                            <div className="font-black text-emerald-900 text-sm mb-1">{getLocaleString(item.title, uiLocale).replace(/\*\*/g, '')}</div>
                            <div className="text-xs font-bold text-emerald-700/80 leading-relaxed">{getLocaleString(item.description, uiLocale).replace(/\*\*/g, '')}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
