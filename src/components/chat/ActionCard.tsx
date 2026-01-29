import { MapPin, Info, CalendarPlus, Train, Car, Bike, Navigation, Zap, Banknote } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { TrapCard } from './TrapCard';
import { HackCard } from './HackCard';

export type ActionType = 'navigate' | 'details' | 'trip' | 'transit' | 'taxi' | 'bike' | 'discovery' | 'trap' | 'hack' | 'poi';

export interface Action {
    type: ActionType;
    label: string | Record<string, string>;
    target: string;
    description?: string | Record<string, string>;
    price?: string | Record<string, string>;
    timeSaved?: string | Record<string, string>;
    metadata?: {
        eta_min?: number;
        eta_max?: number;
        price_approx?: number;
        currency?: string;
        partner_id?: string;
        nudge_log_id?: string;
        score?: number;
        tags?: string[];
        [key: string]: any;
    };
    // New fields for Wisdom Cards
    title?: string | Record<string, string>;
    content?: string | Record<string, string>;
    severity?: 'medium' | 'high' | 'critical';
}

interface ActionCardProps {
    action: Action;
    onClick: (action: Action) => void;
}

const CONFIG: Record<string, any> = {
    navigate: {
        icon: MapPin,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-100',
        hoverColor: 'hover:bg-blue-100'
    },
    details: {
        icon: Info,
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-100',
        hoverColor: 'hover:bg-indigo-100'
    },
    trip: {
        icon: CalendarPlus,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-100',
        hoverColor: 'hover:bg-green-100'
    },
    transit: {
        icon: Train,
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        hoverColor: 'hover:bg-slate-100'
    },
    taxi: {
        icon: Car,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-100',
        hoverColor: 'hover:bg-amber-100'
    },
    bike: {
        icon: Bike,
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-100',
        hoverColor: 'hover:bg-emerald-100'
    },
    discovery: {
        icon: Navigation,
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-100',
        hoverColor: 'hover:bg-rose-100'
    }
};

import { trackPartnerClick } from '@/lib/analytics/partner';

import { resolveText as resolveTextUtil } from '@/lib/i18n/utils';

export function ActionCard({ action, onClick }: ActionCardProps) {
    const t = useTranslations('chat');
    // Safe access to locale should be handled by provider, but hook must be top level
    const currentLocale = useLocale();

    // Helper to resolve localized string or object
    const resolveText = (text: string | Record<string, string> | undefined): string => {
        return resolveTextUtil(text, currentLocale);
    };


    const handleCardClick = () => {
        // Partner Tracking
        if (action.metadata?.partner_id && action.metadata?.nudge_log_id) {
            trackPartnerClick(
                action.metadata.nudge_log_id,
                action.metadata.partner_id,
                action.target || ''
            );
        }
        onClick(action);
    };

    // Smart Fallbacks from Metadata (HybridEngine Compatibility)
    const effectivePrice = action.price
        ? resolveText(action.price)
        : (action.metadata?.price_approx ? `~${action.metadata.price_approx} ${action.metadata.currency || 'JPY'}` : '');

    // Logic: If explicit timeSaved label exists, use it. 
    // Else if eta_min/max exists, format it.
    let effectiveTimeSaved = action.timeSaved ? resolveText(action.timeSaved) : '';
    if (!effectiveTimeSaved && (action.metadata?.eta_min || action.metadata?.eta_max)) {
        const min = action.metadata.eta_min || 0;
        const max = action.metadata.eta_max || min;
        if (max > 0) {
            effectiveTimeSaved = min === max ? `${min} min` : `${min}-${max} min`;
        }
    }

    const effectiveTitle = resolveText(action.title);
    const effectiveLabel = resolveText(action.label);
    const effectiveDescription = resolveText(action.description);
    const effectiveContent = resolveText(action.content);


    // 1. Specialized Cards
    if (action.type === 'trap') {
        return <TrapCard action={action} onClick={handleCardClick} />;
    }
    if (action.type === 'hack') {
        return <HackCard action={action} onClick={handleCardClick} />;
    }

    // New POI Card (Phase 3)
    if (action.type === 'poi') {
        const tags = action.metadata?.tags || [];
        return (
            <button
                onClick={handleCardClick}
                className="w-full text-left group relative overflow-hidden bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
            >
                <div className="p-4 flex gap-4">
                    {/* Icon Box */}
                    <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-100 transition-colors">
                        <MapPin size={20} strokeWidth={2.5} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-80">
                                RECOMMENDATION
                            </span>
                            {action.metadata?.score && action.metadata.score > 0.8 && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {(action.metadata.score * 100).toFixed(0)}% Match
                                </span>
                            )}
                        </div>

                        <h3 className="text-base font-black text-slate-800 leading-tight mb-1 truncate">
                            {effectiveLabel}
                        </h3>

                        <p className="text-xs text-slate-500 font-medium mb-3 line-clamp-1">
                            {effectiveDescription}
                        </p>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {tags.slice(0, 3).map((tag: string, i: number) => (
                                    <span key={i} className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                        {tag}
                                    </span>
                                ))}
                                {tags.length > 3 && (
                                    <span className="text-[10px] font-bold text-slate-400 px-1">
                                        +{tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="self-center text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">
                        →
                    </div>
                </div>
            </button>
        );
    }

    // 2. Standard Cards (Legacy Logic)
    const config = CONFIG[action.type] || CONFIG.details;
    const Icon = config.icon;

    // Prompt 3: L4 Experience Advice Card
    // If it has a title/content structure (from new AI response), use the new layout
    if (effectiveTitle && effectiveContent) {
        return (
            <button
                onClick={handleCardClick}
                className="w-full text-left group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
            >
                {/* (A) Decision Instruction */}
                <div className={`p-5 flex items-start gap-4 ${config.bgColor}`}>
                    <div className={`p-3 bg-white rounded-2xl shadow-sm ${config.textColor}`}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${config.textColor} opacity-80`}>
                                {t('decision')}
                            </span>
                            {effectiveTimeSaved && (
                                <span className="flex items-center gap-1 text-[10px] font-black bg-white/60 px-2 py-0.5 rounded-full text-green-700 uppercase tracking-tighter shadow-sm">
                                    <Zap size={10} fill="currentColor" />
                                    {t('saveTime', { time: effectiveTimeSaved })}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                            {effectiveTitle}
                        </h3>
                    </div>
                </div>

                {/* (B) Traffic Knowledge Tips (Expert Advice) */}
                <div className="p-5 pt-4">
                    <p className="text-sm font-bold text-gray-600 leading-relaxed mb-3">
                        {effectiveContent}
                    </p>

                    {/* Visual Separator */}
                    <div className="w-full h-px bg-gray-100 mb-3" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {effectivePrice ? (
                                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                    {effectivePrice}
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-gray-400">
                                    {t('tapDetails')}
                                </span>
                            )}
                        </div>
                        <div className={`text-sm font-black ${config.textColor} flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity`}>
                            {effectiveLabel} <span className="text-lg">→</span>
                        </div>
                    </div>
                </div>
            </button>
        );
    }

    // Fallback to minimal card for simple actions
    return (
        <button
            onClick={handleCardClick}
            className={`w-full group relative overflow-hidden flex flex-col p-4 rounded-2xl border transition-all duration-300 active:scale-95 text-left shadow-sm hover:shadow-md ${config.bgColor} ${config.borderColor} ${config.hoverColor}`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-2.5 bg-white rounded-xl shadow-sm group-hover:shadow transition-shadow ${config.textColor}`}>
                    <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className={`font-bold text-base ${config.textColor} truncate`}>
                            {effectiveLabel}
                        </div>
                        {effectiveTimeSaved && (
                            <span className="flex items-center gap-1 text-[10px] font-black bg-white/80 px-2 py-0.5 rounded-full text-green-600 uppercase tracking-tighter shadow-sm whitespace-nowrap">
                                <Zap size={10} fill="currentColor" />
                                {effectiveTimeSaved}
                            </span>
                        )}
                    </div>

                    {effectiveDescription && (
                        <div className="text-xs text-black/50 mt-0.5 leading-relaxed font-medium">
                            {effectiveDescription}
                        </div>
                    )}

                    {(effectivePrice) && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-black/60 bg-white/40 px-2.5 py-1 rounded-lg border border-white/50">
                                <Banknote size={12} className="opacity-50" />
                                {effectivePrice}
                            </div>
                        </div>
                    )}
                </div>

                <div className={`self-center text-lg ${config.textColor} opacity-10 group-hover:opacity-100 group-hover:translate-x-1 transition-all`}>
                    →
                </div>
            </div>
        </button>
    );
}
