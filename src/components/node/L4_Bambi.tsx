'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { Sparkles, Send, User, Bot, Loader2, Clock, Briefcase, Wallet, Armchair, Baby, Compass, MapPin, CheckCircle2, Mic, Maximize2, Layout, LayoutPanelTop, Square } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useDifyChat } from '@/hooks/useDifyChat';

import { hybridEngine } from '@/lib/l4/HybridEngine';

import { metricsCollector } from '@/lib/l4/monitoring/MetricsCollector';
import ReactMarkdown from 'react-markdown';

interface L4_BambiProps {
    data: StationUIProfile;
    seedQuestion?: string;
    seedUserProfile?: string;
    onSeedConsumed?: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isStrategy?: boolean; // New flag for structured response
}

export function L4_Bambi({ data, seedQuestion, seedUserProfile, onSeedConsumed }: L4_BambiProps) {
    const tL4 = useTranslations('l4');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const { zone } = useZoneAwareness();
    const { id: stationId, name } = data || {};
    const setCurrentNode = useAppStore(s => s.setCurrentNode);
    const setBottomSheetOpen = useAppStore(s => s.setBottomSheetOpen);
    const setUserProfileStore = useAppStore(s => s.setUserProfile);
    const isMobile = useAppStore(s => s.isMobile);
    const chatDisplayMode = useAppStore(s => s.chatDisplayMode);
    const setChatDisplayMode = useAppStore(s => s.setChatDisplayMode);

    // Robust Name Resolution
    const displayName = (name?.zh && name?.zh !== tL4('station') && name?.zh !== 'Station')
        ? name.zh
        : (name?.en || name?.ja || (stationId?.split(':').pop()?.split('.').pop()) || tCommon('station'));

    // Chat Hook
    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        suggestedQuestions,
        sendMessage,
        clearMessages,
        messagesEndRef
    } = useDifyChat({
        stationId: stationId,
        stationName: displayName,
        onComplete: () => { }
    });

    const [input, setInput] = useState('');

    // Context Cards
    const bestCard = useMemo(() => {
        const cards = data?.l4_cards || [];
        return cards.find(c => c.type === 'primary') || cards[0] || null;
    }, [data?.l4_cards]);

    const otherCards = useMemo(() => {
        const cards = data?.l4_cards || [];
        if (!bestCard) return [];
        return cards.filter(c => c.id !== bestCard.id);
    }, [data?.l4_cards, bestCard]);

    const [isOtherOpen, setIsOtherOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(false); // Kept for existing UI logic, but managed by hook normally

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: tL4('greeting', { name: displayName }),
            } as any]);
        }
    }, [displayName, tL4, setMessages]);

    // Send Logic
    const handleSend = useCallback(async (textOverride?: string, profileOverride?: string) => {
        const text = textOverride || input.trim();
        if (!text || isLoading) return;

        if (!textOverride) setInput('');
        await sendMessage(text, profileOverride || seedUserProfile || 'general');
    }, [input, isLoading, sendMessage, seedUserProfile]);

    // Seed Question Handling
    const lastSeedQuestionRef = useRef<string>('');
    useEffect(() => {
        const text = String(seedQuestion || '').trim();
        if (!text) return;
        if (isLoading) return;
        if (lastSeedQuestionRef.current === text) return;

        lastSeedQuestionRef.current = text;
        handleSend(text);
        onSeedConsumed?.();
    }, [seedQuestion, isLoading, handleSend, onSeedConsumed]);

    // Quick Action Handler defined here as it uses handleSend
    const handleQuickAction = (actionId: string, prompt: string) => {
        handleSend(prompt);
    };

    // Quick Buttons for Bambi (Custom implementation)
    const quickButtons = useMemo(() => {
        return [
            {
                id: 'route',
                label: tL4('quickButtons.route.label'),
                demands: ['speed'],
                profile: 'general',
                prompt: tL4('quickButtons.route.prompt', { station: displayName, id: stationId || '' })
            },
            {
                id: 'fare',
                label: tL4('quickButtons.fare.label'),
                demands: ['budget'],
                profile: 'general',
                prompt: tL4('quickButtons.fare.prompt', { station: displayName, id: stationId || '' })
            },
            {
                id: 'timetable',
                label: tL4('quickButtons.timetable.label'),
                demands: ['speed'],
                profile: 'general',
                prompt: tL4('quickButtons.timetable.prompt', { station: displayName, id: stationId || '' })
            }
        ];
    }, [displayName, stationId, tL4]);

    // Hybrid UI State (for demand chips)
    const [destination, setDestination] = useState('');
    const [selectedDemands, setSelectedDemands] = useState<string[]>([]);

    // Derived user context
    const userContext = useMemo(() => {
        const ctx: string[] = [];
        if (selectedDemands.includes('speed')) ctx.push('rush');
        if (selectedDemands.includes('luggage')) ctx.push('luggage');
        if (selectedDemands.includes('family')) ctx.push('stroller');
        if (selectedDemands.includes('accessibility')) ctx.push('accessibility');
        return ctx;
    }, [selectedDemands]);

    const demands = [
        { id: 'speed', icon: Clock, label: tL4('demands.speed') },
        { id: 'luggage', icon: Briefcase, label: tL4('demands.luggage') },
        { id: 'budget', icon: Wallet, label: tL4('demands.budget') },
        { id: 'comfort', icon: Armchair, label: tL4('demands.comfort') },
        { id: 'family', icon: Baby, label: tL4('demands.family') },
        { id: 'accessibility', icon: Compass, label: tL4('demands.accessibility') }
    ];

    if (isMobile && chatDisplayMode === 'mini') {
        const lastMessage = messages[messages.length - 1];
        return (
            <div className="flex flex-col h-full bg-white relative overflow-hidden">
                <div className="flex-1 flex items-center px-4 gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0">
                        <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-500 truncate">
                            {lastMessage ? lastMessage.content : tL4('initialMessage', { station: displayName })}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            className="p-2.5 bg-slate-50 text-slate-400 rounded-full active:scale-95 transition-all"
                            onClick={() => {
                                // Voice input placeholder
                            }}
                        >
                            <Mic size={18} />
                        </button>
                        <button
                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full active:scale-95 transition-all"
                            onClick={() => setChatDisplayMode('split')}
                        >
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header Area */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 tracking-tight">{tL4('bambiStrategy')}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tL4('subtitle')}</p>
                            {isOffline && (
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700/90 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200/70">
                                    {tCommon('temporarilyUnavailable')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Display Mode Toggle for Mobile */}
                {isMobile && (
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setChatDisplayMode('mini')}
                            className={`p-2 rounded-lg transition-all ${chatDisplayMode === 'mini' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                        >
                            <Square size={16} />
                        </button>
                        <button
                            onClick={() => setChatDisplayMode('split')}
                            className={`p-2 rounded-lg transition-all ${chatDisplayMode === 'split' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                        >
                            <LayoutPanelTop size={16} />
                        </button>
                        <button
                            onClick={() => setChatDisplayMode('full')}
                            className={`p-2 rounded-lg transition-all ${chatDisplayMode === 'full' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                        >
                            <Layout size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length > 0 && bestCard && (
                    <div className="rounded-[28px] p-5 text-white bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-[0_18px_50px_rgba(79,70,229,0.28)] border border-white/15">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">{tL4('topPick')}</div>
                                <div className="mt-2 text-lg font-black leading-tight tracking-tight break-words">
                                    {getLocaleString(bestCard.title, locale)}
                                </div>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                                <MapPin size={18} className="text-white" />
                            </div>
                        </div>
                        <div className="mt-3 text-sm font-bold text-white/90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                            {getLocaleString(bestCard.description, locale)}
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => {
                                    if (bestCard.actionUrl) {
                                        window.open(bestCard.actionUrl, '_blank', 'noopener,noreferrer');
                                        return;
                                    }
                                    if (otherCards.length > 0) setIsOtherOpen(true);
                                }}
                                className="flex-1 py-3 rounded-2xl bg-white text-indigo-700 font-black text-xs tracking-widest hover:bg-indigo-50 transition-colors active:scale-[0.99]"
                            >
                                {getLocaleString(bestCard.actionLabel, locale) || tCommon('view')}
                            </button>

                            {/* Apply on Map: focus current station and reveal map context */}
                            <button
                                onClick={() => {
                                    if (stationId) {
                                        setCurrentNode(stationId);
                                        setBottomSheetOpen(false);
                                    }
                                }}
                                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-xs tracking-widest hover:bg-white/15 transition-colors active:scale-[0.99]"
                            >
                                {locale.startsWith('ja') ? '地図に反映' : locale.startsWith('en') ? 'Apply to Map' : '套用到地圖'}
                            </button>

                            {otherCards.length > 0 && (
                                <button
                                    onClick={() => setIsOtherOpen(v => !v)}
                                    className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-xs tracking-widest hover:bg-white/15 transition-colors active:scale-[0.99]"
                                >
                                    {tL4('alternatives')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {isOtherOpen && otherCards.length > 0 && (
                    <div className="space-y-3">
                        {otherCards.map((card) => (
                            <div key={card.id} className="bg-white rounded-[22px] border border-slate-100 shadow-sm p-4">
                                <div className="text-sm font-black text-slate-900 leading-snug">
                                    {getLocaleString(card.title, locale)}
                                </div>
                                <div className="mt-2 text-xs font-bold text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {getLocaleString(card.description, locale)}
                                </div>
                                <button
                                    onClick={() => {
                                        if (card.actionUrl) window.open(card.actionUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    disabled={!card.actionUrl}
                                    className={`mt-3 w-full py-3 rounded-2xl font-black text-xs tracking-widest transition-colors active:scale-[0.99] ${card.actionUrl ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-300'}`}
                                >
                                    {getLocaleString(card.actionLabel, locale) || tCommon('view')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-full rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                            }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {msg.role === 'user' ? tL4('userLabel') : tL4('bambiLabel')}
                                </span>
                            </div>
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-black">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Thinking Indicator */}
                {thinkingStep && (
                    <div className="flex justify-start">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                            <Loader2 size={14} className="text-slate-400 animate-spin" />
                            <span className="text-[11px] font-bold text-slate-400">{thinkingStep}</span>
                        </div>
                    </div>
                )}

                {suggestedQuestions.length > 0 && !thinkingStep && (
                    <div className="flex flex-col gap-2 mt-2 px-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Suggested</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    disabled={isLoading}
                                    className="text-left bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Overlay (Hybrid Strategy) */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
                <div className="space-y-4 w-full">
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {quickButtons.map(b => (
                            <button
                                key={b.id}
                                onClick={() => {
                                    setSelectedDemands(b.demands);
                                    const text = String(b.prompt || '').trim();
                                    if (!text) return;
                                    handleSend(text, b.profile);
                                }}
                                disabled={isLoading}
                                className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black whitespace-nowrap text-slate-700 hover:border-indigo-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>
                    {/* Destination Input & Free Text */}
                    <div className="relative group flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Send size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder={tL4('inputPlaceholder')}
                                value={input || destination}
                                disabled={isLoading}
                                onChange={(e) => {
                                    setDestination(e.target.value);
                                    setInput(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if ((e.nativeEvent as any)?.isComposing) return;
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        let profile = 'general';
                                        if (selectedDemands.includes('accessibility')) profile = 'wheelchair';
                                        else if (selectedDemands.includes('family')) profile = 'stroller';
                                        handleSend(input || destination, profile);
                                    }
                                }}
                                aria-label={tL4('inputPlaceholder')}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim()}
                            className="h-11 w-11 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>

                    {/* Demand Chips (Multi-select) */}
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {demands.map(demand => {
                            const isSelected = selectedDemands.includes(demand.id);
                            return (
                                <button
                                    key={demand.id}
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedDemands(prev => prev.filter(id => id !== demand.id));
                                        } else {
                                            setSelectedDemands(prev => [...prev, demand.id]);
                                        }

                                        // Sync user profile for map & agent
                                        if (demand.id === 'accessibility') setUserProfileStore('wheelchair');
                                        if (demand.id === 'family') setUserProfileStore('stroller');
                                    }}
                                    disabled={isLoading}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black whitespace-nowrap transition-all ${isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                                        }`}
                                >
                                    <demand.icon size={14} />
                                    {demand.label}
                                    {isSelected && <CheckCircle2 size={12} className="ml-1" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => {
                            let profile = 'general';
                            if (selectedDemands.includes('accessibility')) profile = 'wheelchair';
                            else if (selectedDemands.includes('family')) profile = 'stroller';

                            const textToSend = input || destination;
                            if (textToSend) handleSend(textToSend, profile);
                        }}
                        disabled={(!input && !destination) || isLoading}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-widest transition-all ${(!input && !destination) || isLoading
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95'
                            }`}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isLoading ? tCommon('loading') : tL4('chips.synthesize')}
                    </button>
                </div>
            </div>
        </div>
    );
}
