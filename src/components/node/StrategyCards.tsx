'use client';

import { MatchedStrategyCard } from '@/types/lutagu_l4';
import { ExternalLink, Info, AlertTriangle, Lightbulb, Ticket, Clock, Snowflake } from 'lucide-react';
import { motion } from 'framer-motion';

interface StrategyCardsProps {
    cards: MatchedStrategyCard[];
    locale: string;
}

export function StrategyCards({ cards, locale }: StrategyCardsProps) {
    if (!cards || cards.length === 0) return null;

    const getIconColor = (type: string) => {
        switch (type) {
            case 'warning': return 'bg-red-500 shadow-red-200';
            case 'tip': return 'bg-amber-500 shadow-amber-200';
            case 'ticket_advice': return 'bg-emerald-500 shadow-emerald-200';
            case 'timing': return 'bg-blue-500 shadow-blue-200';
            case 'seasonal': return 'bg-cyan-500 shadow-cyan-200';
            case 'ai_suggestion': return 'bg-purple-500 shadow-purple-200';
            default: return 'bg-slate-500 shadow-slate-200';
        }
    };

    const getCardBg = (type: string) => {
        switch (type) {
            case 'warning': return 'from-red-50 to-orange-50 border-red-200';
            case 'tip': return 'from-amber-50 to-orange-50 border-amber-200';
            case 'ticket_advice': return 'from-emerald-50 to-teal-50 border-emerald-200';
            case 'timing': return 'from-blue-50 to-indigo-50 border-blue-200';
            case 'seasonal': return 'from-cyan-50 to-blue-50 border-cyan-200';
            case 'ai_suggestion': return 'from-purple-50 to-fuchsia-50 border-purple-200';
            default: return 'from-slate-50 to-gray-50 border-slate-200';
        }
    };

    const getTitleColor = (type: string) => {
        switch (type) {
            case 'warning': return 'text-red-800';
            case 'tip': return 'text-amber-800';
            case 'ticket_advice': return 'text-emerald-800';
            case 'timing': return 'text-blue-800';
            case 'seasonal': return 'text-cyan-800';
            case 'ai_suggestion': return 'text-purple-800';
            default: return 'text-slate-800';
        }
    };

    const getSubtitleColor = (type: string) => {
        switch (type) {
            case 'warning': return 'text-red-600';
            case 'tip': return 'text-amber-600';
            case 'ticket_advice': return 'text-emerald-600';
            case 'timing': return 'text-blue-600';
            case 'seasonal': return 'text-cyan-600';
            case 'ai_suggestion': return 'text-purple-600';
            default: return 'text-slate-600';
        }
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 px-1 mb-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h3 className="text-lg font-black text-slate-800">
                    {locale.startsWith('zh') ? 'BambiGO 智能建議' : locale === 'ja' ? 'BambiGO スマート提案' : 'BambiGO Smart Tips'}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                    L4 Layer Active
                </span>
            </div>

            {cards.map((card, idx) => (
                <motion.div
                    key={card.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`rounded-2xl bg-gradient-to-r ${getCardBg(card.type)} border p-4 shadow-sm hover:shadow-md transition-all group`}
                >
                    <div className="flex items-start gap-3">
                        {/* Icon Badge */}
                        <div className={`shrink-0 w-10 h-10 rounded-xl ${getIconColor(card.type)} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                            <span className="text-xl">{card.icon || '💡'}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <div className={`text-sm font-black truncate ${getTitleColor(card.type)}`}>
                                    {card.title}
                                </div>
                                {card.priority >= 80 && (
                                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider bg-white/60 px-1.5 py-0.5 rounded border border-white/40 text-red-500">
                                        High Priority
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-xs font-bold text-slate-600 leading-relaxed mb-3">
                                {card.description}
                            </p>

                            {/* Action Button */}
                            {card.actionUrl && (
                                <a
                                    href={card.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-white/50 text-[11px] font-black text-slate-700 hover:bg-white hover:shadow-sm transition-all active:scale-95"
                                >
                                    {card.actionLabel || (locale.startsWith('zh') ? '查看詳情' : 'Details')}
                                    <ExternalLink size={12} className="opacity-50" />
                                </a>
                            )}
                        </div>
                    </div>

                    {card._debug_reason && (
                        <div className="mt-3 pt-2 border-t border-black/5 flex items-center gap-1.5">
                            <span className="text-[8px] font-mono text-slate-400">
                                DEBUG: {card._debug_reason}
                            </span>
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
