'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { Sparkles, Send, User, Bot, Loader2, Clock, Briefcase, Wallet, Armchair, Baby, Compass, MapPin, CheckCircle2 } from 'lucide-react';

interface L4_StrategyProps {
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

export function L4_Strategy({ data, seedQuestion, seedUserProfile, onSeedConsumed }: L4_StrategyProps) {
    const tL4 = useTranslations('l4');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const { id: stationId, name } = data || {};

    // Robust Name Resolution
    const displayName = (name?.zh && name?.zh !== '車站' && name?.zh !== 'Station')
        ? name.zh
        : (name?.en || name?.ja || (stationId?.split(':').pop()?.split('.').pop()) || tCommon('station'));

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);

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

    // Initialize greeting ONLY once when displayName becomes available
    const [hasGreeted, setHasGreeted] = useState(false);
    useEffect(() => {
        if (displayName && !hasGreeted) {
            setMessages([{ role: 'assistant', content: tL4('initialMessage', { station: displayName }) }]);
            setHasGreeted(true);
        }
    }, [displayName, hasGreeted, tL4]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // Cognitive State Visualization
    const [thinkingStep, setThinkingStep] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastSeedQuestionRef = useRef<string>('');

    // Hybrid UI State
    const [destination, setDestination] = useState('');
    const [selectedDemands, setSelectedDemands] = useState<string[]>([]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingStep]);

    // Send Message Logic
    const handleSend = useCallback(async (text: string, userProfile: string = 'general') => {
        if (!text.trim() || isLoading) return;

        const userMsg = { role: 'user' as const, content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setIsOffline(false);
        setThinkingStep(tL4('thinking.initializing'));

        // Fake "Thinking Steps" to visualize the 4 Dimensions
        const steps = [
            tL4('thinking.l2'),
            tL4('thinking.l3'),
            tL4('thinking.kb'),
            tL4('thinking.synthesizing')
        ];

        let stepIdx = 0;
        const stepInterval = setInterval(() => {
            if (stepIdx < steps.length) {
                setThinkingStep(steps[stepIdx]);
                stepIdx++;
            }
        }, 1500);

        try {
            // Use Dify Agent endpoint
            const response = await fetch('/api/dify/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: text,
                    inputs: {
                        user_profile: userProfile,
                        current_station: stationId || '',
                        locale
                    }
                })
            });

            clearInterval(stepInterval);

            if (!response.ok) throw new Error('Network error');
            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            setThinkingStep('');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            // Dify uses 'agent_message' for streaming responses
                            if (data.event === 'agent_message' || data.event === 'message') {
                                accumulatedResponse += (data.answer || '');
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = accumulatedResponse;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            // Partials or heartbeat
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: tL4('chatError') }]);
            clearInterval(stepInterval);
        } finally {
            setIsLoading(false);
            setThinkingStep('');
        }
    }, [isLoading, locale, messages, stationId, tL4]);

    useEffect(() => {
        const text = String(seedQuestion || '').trim();
        if (!text) return;
        if (!hasGreeted) return;
        if (isLoading) return;
        if (lastSeedQuestionRef.current === text) return;

        lastSeedQuestionRef.current = text;
        handleSend(text, seedUserProfile || 'general');
        onSeedConsumed?.();
    }, [seedQuestion, seedUserProfile, hasGreeted, isLoading, handleSend, onSeedConsumed]);

    const demands = [
        { id: 'speed', icon: Clock, label: tL4('demands.speed') },
        { id: 'luggage', icon: Briefcase, label: tL4('demands.luggage') },
        { id: 'budget', icon: Wallet, label: tL4('demands.budget') },
        { id: 'comfort', icon: Armchair, label: tL4('demands.comfort') },
        { id: 'family', icon: Baby, label: tL4('demands.family') },
        { id: 'accessibility', icon: Compass, label: tL4('demands.accessibility') }
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header Area */}
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 tracking-tight">{displayName}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tL4('subtitle')}</p>
                            {isOffline && (
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700/90 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200/70">
                                    {locale.startsWith('en') ? 'Offline' : locale.startsWith('ja') ? 'オフライン' : '離線'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {bestCard && (
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
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                            }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {msg.role === 'user' ? tL4('userLabel') : tL4('lutaguLabel')}
                                </span>
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {/* Thinking Indicator */}
                {thinkingStep && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <Loader2 size={16} className="text-indigo-600 animate-spin" />
                            <span className="text-xs font-bold text-slate-500 animate-pulse">{thinkingStep}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Overlay (Hybrid Strategy) */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
                <div className="space-y-4 max-w-lg mx-auto">
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
