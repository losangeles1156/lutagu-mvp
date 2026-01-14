import { MapPin, Info, CalendarPlus, Train, Car, Navigation, Zap, Banknote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TrapCard } from './TrapCard';
import { HackCard } from './HackCard';

export type ActionType = 'navigate' | 'details' | 'trip' | 'transit' | 'taxi' | 'discovery' | 'trap' | 'hack' | 'poi';

export interface Action {
    type: ActionType;
    label: string;
    target: string;
    description?: string;
    price?: string;
    timeSaved?: string;
    metadata?: any;
    // New fields for Wisdom Cards
    title?: string;
    content?: string;
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
    discovery: {
        icon: Navigation,
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-100',
        hoverColor: 'hover:bg-rose-100'
    }
};

import { trackPartnerClick } from '@/lib/analytics/partner';

export function ActionCard({ action, onClick }: ActionCardProps) {
    const t = useTranslations('chat');

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
                            {action.label}
                        </h3>

                        <p className="text-xs text-slate-500 font-medium mb-3 line-clamp-1">
                            {action.description}
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

    // Helper to resolve localized string or object
    const resolveText = (text: string | Record<string, string> | undefined): string => {
        if (!text) return '';
        if (typeof text === 'string') return text;
        // @ts-ignore
        return text[t('locale') || 'zh-TW'] || text['en'] || text['zh-TW'] || Object.values(text)[0] || '';
    };

    // 2. Standard Cards (Legacy Logic)
    const config = CONFIG[action.type] || CONFIG.details;
    const Icon = config.icon;

    // Prompt 3: L4 Experience Advice Card
    // If it has a title/content structure (from new AI response), use the new layout
    if (action.title && action.content) {
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
                            {action.timeSaved && (
                                <span className="flex items-center gap-1 text-[10px] font-black bg-white/60 px-2 py-0.5 rounded-full text-green-700 uppercase tracking-tighter shadow-sm">
                                    <Zap size={10} fill="currentColor" />
                                    {t('saveTime', { time: resolveText(action.timeSaved) })}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                            {resolveText(action.title)}
                        </h3>
                    </div>
                </div>

                {/* (B) Traffic Knowledge Tips (Expert Advice) */}
                <div className="p-5 pt-4">
                    <p className="text-sm font-bold text-gray-600 leading-relaxed mb-3">
                        {resolveText(action.content)}
                    </p>

                    {/* Visual Separator */}
                    <div className="w-full h-px bg-gray-100 mb-3" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {action.price ? (
                                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                    {resolveText(action.price)}
                                </span>
                            ) : (
                                <span className="text-xs font-bold text-gray-400">
                                    {t('tapDetails')}
                                </span>
                            )}
                        </div>
                        <div className={`text-sm font-black ${config.textColor} flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity`}>
                            {resolveText(action.label)} <span className="text-lg">→</span>
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
                            {resolveText(action.label)}
                        </div>
                        {action.timeSaved && (
                            <span className="flex items-center gap-1 text-[10px] font-black bg-white/80 px-2 py-0.5 rounded-full text-green-600 uppercase tracking-tighter shadow-sm whitespace-nowrap">
                                <Zap size={10} fill="currentColor" />
                                {resolveText(action.timeSaved)}
                            </span>
                        )}
                    </div>

                    {action.description && (
                        <div className="text-xs text-black/50 mt-0.5 leading-relaxed font-medium">
                            {resolveText(action.description)}
                        </div>
                    )}

                    {(action.price) && (
                        <div className="flex items-center gap-1.5 mt-2">
                            {action.price && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-black/60 bg-white/40 px-2.5 py-1 rounded-lg border border-white/50">
                                    <Banknote size={12} className="opacity-50" />
                                    {resolveText(action.price)}
                                </div>
                            )}
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
