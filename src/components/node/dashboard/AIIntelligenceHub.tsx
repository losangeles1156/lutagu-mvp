'use client';

import { Sparkles, AlertTriangle, Lightbulb, MessageSquare } from 'lucide-react';
import type { L4Knowledge } from '@/lib/types/stationStandard';

interface AIIntelligenceHubProps {
    l4Knowledge?: L4Knowledge;
    knowledgeFilter: 'all' | 'traps' | 'hacks';
    onFilterChange: (filter: 'all' | 'traps' | 'hacks') => void;
    onStartChat: () => void;
    t: any;
}

export function AIIntelligenceHub({
    l4Knowledge,
    knowledgeFilter,
    onFilterChange,
    onStartChat,
    t
}: AIIntelligenceHubProps) {
    return (
        <section className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/60 p-6 shadow-2xl shadow-indigo-100/50 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('aiPerceptionActive')}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 ring-white">
                        <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            {t('aiAssistant')}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">
                            {t('aiSubtitle')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onFilterChange(knowledgeFilter === 'traps' ? 'all' : 'traps')}
                        className={`
                            relative rounded-2xl p-4 border text-left transition-all active:scale-[0.98] outline-none ring-2 ring-transparent
                            ${knowledgeFilter === 'traps'
                                ? 'bg-red-50 border-red-200 ring-red-200/50 shadow-sm'
                                : 'bg-slate-50/50 border-slate-100/50 hover:bg-white hover:shadow-md'
                            }
                            ${knowledgeFilter !== 'all' && knowledgeFilter !== 'traps' ? 'opacity-50 grayscale' : 'opacity-100'}
                        `}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                <AlertTriangle size={14} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('trapGuide')}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-800">{l4Knowledge?.traps?.length || 0}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase">{t('expertTips')}</span>
                        </div>
                    </button>

                    <button
                        onClick={() => onFilterChange(knowledgeFilter === 'hacks' ? 'all' : 'hacks')}
                        className={`
                            relative rounded-2xl p-4 border text-left transition-all active:scale-[0.98] outline-none ring-2 ring-transparent
                            ${knowledgeFilter === 'hacks'
                                ? 'bg-emerald-50 border-emerald-200 ring-emerald-200/50 shadow-sm'
                                : 'bg-slate-50/50 border-slate-100/50 hover:bg-white hover:shadow-md'
                            }
                            ${knowledgeFilter !== 'all' && knowledgeFilter !== 'hacks' ? 'opacity-50 grayscale' : 'opacity-100'}
                        `}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Lightbulb size={14} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('proHacksLabel')}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-800">{l4Knowledge?.hacks?.length || 0}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase">{t('proHacks')}</span>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onStartChat}
                    className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                >
                    <MessageSquare size={16} />
                    {t('startChat')}
                </button>
            </div>
        </section>
    );
}
