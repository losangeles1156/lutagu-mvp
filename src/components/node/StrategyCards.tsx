'use client';

import { MatchedStrategyCard } from '@/types/lutagu_l4';
import { ExternalLink, Info, AlertTriangle, Lightbulb, Ticket, Clock, Snowflake, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { useState } from 'react';
import { trackFunnelEvent } from '@/lib/tracking';
import { getPartnerIdFromUrl, getSafeExternalUrl } from '@/config/partners';

interface StrategyCardsProps {
    cards: MatchedStrategyCard[];
    locale: string;
}

export function StrategyCards({ cards, locale }: StrategyCardsProps) {
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    if (!cards || cards.length === 0) return null;

    const getIconColor = (type: string) => {
        switch (type) {
            case 'warning': return 'bg-rose-500 shadow-rose-200';
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
            case 'warning': return 'bg-white/60 border-rose-200/60 shadow-rose-200/10';
            case 'tip': return 'bg-white/60 border-amber-200/60 shadow-amber-200/10';
            case 'ticket_advice': return 'bg-white/60 border-emerald-200/60 shadow-emerald-200/10';
            case 'timing': return 'bg-white/60 border-blue-200/60 shadow-blue-200/10';
            case 'seasonal': return 'bg-white/60 border-cyan-200/60 shadow-cyan-200/10';
            case 'ai_suggestion': return 'bg-white/60 border-purple-200/60 shadow-purple-200/10';
            default: return 'bg-white/60 border-white/80 shadow-slate-200/10';
        }
    };

    const getTitleColor = (type: string) => {
        switch (type) {
            case 'warning': return 'text-rose-900';
            case 'tip': return 'text-amber-900';
            case 'ticket_advice': return 'text-emerald-900';
            case 'timing': return 'text-blue-900';
            case 'seasonal': return 'text-cyan-900';
            case 'ai_suggestion': return 'text-purple-900';
            default: return 'text-slate-900';
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedCardId(expandedCardId === id ? null : id);
    };

    const handleExternalClick = (card: MatchedStrategyCard) => {
        const safeUrl = card.actionUrl ? getSafeExternalUrl(card.actionUrl) : null;
        if (!safeUrl) return;

        const partnerId = (card.metadata && card.metadata.partner_id)
            ? String(card.metadata.partner_id)
            : (getPartnerIdFromUrl(safeUrl) || undefined);

        trackFunnelEvent({
            step_name: 'external_link_click',
            step_number: 5,
            path: '/l4',
            metadata: {
                target_url: safeUrl,
                link_type: (card.metadata && card.metadata.link_type) ? String(card.metadata.link_type) : 'l4_card',
                partner_id: partnerId,
                card_id: card.id,
                card_type: card.type
            }
        });
    };

    return (
        <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 px-1 mb-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {locale.startsWith('zh') ? 'LUTAGU 智能建議' : locale === 'ja' ? 'LUTAGU スマート提案' : 'LUTAGU Smart Tips'}
                </h3>
                <div className="ml-auto flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    <Sparkles size={10} className="text-indigo-500" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">L4 Active</span>
                </div>
            </div>

            {cards.map((card, idx) => {
                const isExpanded = expandedCardId === (card.id || String(idx));
                const descStr = typeof card.description === 'object'
                    ? getLocaleString(card.description, locale)
                    : (card.description || '');
                const isLongDescription = descStr.length > 60;
                const safeActionUrl = card.actionUrl ? getSafeExternalUrl(card.actionUrl) : null;

                return (
                    <motion.div
                        key={card.id || idx}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                            delay: idx * 0.08
                        }}
                        className={`rounded-[2rem] ${getCardBg(card.type)} border backdrop-blur-xl p-5 shadow-xl shadow-slate-200/10 hover:shadow-2xl hover:shadow-slate-200/20 transition-all group ring-1 ring-white/20`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Icon Badge */}
                            <div className={`shrink-0 w-12 h-12 rounded-2xl ${getIconColor(card.type)} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-white/20 transform rotate-45 translate-y-8" />
                                <span className="text-2xl relative z-10">{card.icon || '💡'}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className={`text-base font-black truncate ${getTitleColor(card.type)}`}>
                                        {typeof card.title === 'object' ? getLocaleString(card.title, locale) : card.title}
                                    </div>
                                    {card.priority >= 80 && (
                                        <div className="shrink-0 flex items-center gap-1 bg-rose-100/50 px-2 py-0.5 rounded-full border border-rose-200/50">
                                            <AlertTriangle size={10} className="text-rose-600" />
                                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">High</span>
                                        </div>
                                    )}
                                </div>

                                <div className={`text-sm font-bold text-slate-600 leading-relaxed ${!isExpanded && isLongDescription ? 'line-clamp-2' : ''}`}>
                                    {typeof card.description === 'object' ? getLocaleString(card.description, locale) : card.description}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {/* Action Button */}
                                    {safeActionUrl && (
                                        <a
                                            href={safeActionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleExternalClick(card)}
                                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-[11px] font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                                        >
                                            {card.actionLabel || (locale.startsWith('zh') ? '立即查看 View' : 'View Now')}
                                            <ExternalLink size={12} className="opacity-70" />
                                        </a>
                                    )}

                                    {/* Expand Button */}
                                    {isLongDescription && (
                                        <button
                                            onClick={() => toggleExpand(card.id || String(idx))}
                                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white/80 border border-slate-200/60 text-[11px] font-black text-slate-600 hover:text-indigo-600 hover:bg-white transition-all active:scale-95 shadow-sm"
                                        >
                                            {isExpanded
                                                ? (locale.startsWith('zh') ? '收起詳情 Hide' : 'Show Less')
                                                : (locale.startsWith('zh') ? '展開建議 More' : 'Show More')}
                                            <ChevronDown size={12} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {card._debug_reason && (
                            <div className="mt-4 pt-3 border-t border-slate-900/5 flex items-center gap-1.5 opacity-40">
                                <span className="text-[8px] font-mono text-slate-500">
                                    ID: {card.id} | SCORE: {card.priority} | {card._debug_reason}
                                </span>
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
