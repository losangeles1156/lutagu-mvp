'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { Sparkles, Send, User, Bot, Loader2, Clock, Briefcase, Wallet, Armchair, Baby, Compass, MapPin, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';

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
    // Greeting logic removed to prevent premature messages


    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    // Cognitive State Visualization
    const [thinkingStep, setThinkingStep] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastSeedQuestionRef = useRef<string>('');
    const difyUserIdRef = useRef<string>(
        globalThis.crypto?.randomUUID?.() ||
        `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );
    const difyConversationIdRef = useRef<string | null>(null);

    // Hybrid UI State
    const [destination, setDestination] = useState('');
    const [selectedDemands, setSelectedDemands] = useState<string[]>([]);

    const userContext = useMemo(() => {
        const ctx: string[] = [];
        if (selectedDemands.includes('speed')) ctx.push('rush');
        if (selectedDemands.includes('luggage')) ctx.push('luggage');
        if (selectedDemands.includes('family')) ctx.push('stroller');
        if (selectedDemands.includes('accessibility')) ctx.push('accessibility');
        return ctx;
    }, [selectedDemands]);

    const quickButtons = useMemo(() => {
        if (locale === 'ja') {
            return [
                {
                    id: 'route',
                    label: '最短ルート',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `タスク：ルート案内\n出発：${displayName}（${stationId || ''}）\n目的地：先に「どこへ行きたいか（駅名/観光地）」を聞いてください\n要望：最速/乗換少なめ（どちらか）\n出力：2案、各案にルート・所要時間・乗換のコツを含める`
                },
                {
                    id: 'access',
                    label: 'バリアフリー',
                    demands: ['accessibility'],
                    profile: 'wheelchair',
                    prompt: `タスク：バリアフリー案内\n現在地：${displayName}（${stationId || ''}）\n要望：エレベーターで移動できる出口/動線を優先\n不足情報：必要なら「どの出口/どの路線/どの方向か」を先に質問\n出力：結論→確認質問（必要時）の順で短く`
                },
                {
                    id: 'status',
                    label: '遅延・代替',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `タスク：運行状況\n影響駅：${displayName}（${stationId || ''}）\nやること：この駅に影響する遅延/運休があるか確認し、あるなら代替案を1つ\n出力：要点だけ（1-2行）`
                }
            ];
        }
        if (locale === 'en') {
            return [
                {
                    id: 'route',
                    label: 'Fastest Route',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `Task: Route planning\nFrom: ${displayName} (${stationId || ''})\nTo: Ask me where I want to go first (station/POI)\nPreference: fastest vs fewer transfers (pick one)\nOutput: 2 options, each with route, ETA, and key transfer tips`
                },
                {
                    id: 'access',
                    label: 'Accessibility',
                    demands: ['accessibility'],
                    profile: 'wheelchair',
                    prompt: `Task: Accessibility guidance\nLocation: ${displayName} (${stationId || ''})\nPriority: elevator-only path and accessible exits\nIf missing info: ask which exit/line/direction\nOutput: direct recommendation first, then questions if needed`
                },
                {
                    id: 'status',
                    label: 'Delays & Backup',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `Task: Live disruptions\nAffected station: ${displayName} (${stationId || ''})\nDo: check any delays/disruptions impacting this station and give 1 backup suggestion\nOutput: concise bullets`
                }
            ];
        }
        return [
            {
                id: 'route',
                label: '最快路線',
                demands: ['speed'],
                profile: 'general',
                prompt: `任務：路線規劃\n出發：${displayName}（${stationId || ''}）\n目的地：請先問我想去哪一站/景點\n需求：最快 / 少轉乘（二選一）\n輸出：給 2 個選項，各含：路線、預估時間、轉乘關鍵點`
            },
            {
                id: 'access',
                label: '無障礙',
                demands: ['accessibility'],
                profile: 'wheelchair',
                prompt: `任務：無障礙動線\n目前：${displayName}（${stationId || ''}）\n需求：優先電梯可達的出口/動線\n不足資訊：需要時先問我「哪個出口 / 哪條線 / 方向」\n輸出：先給結論，再補必要追問`
            },
            {
                id: 'status',
                label: '延誤/替代',
                demands: ['speed'],
                profile: 'general',
                prompt: `任務：即時運行狀態\n影響車站：${displayName}（${stationId || ''}）\n要做：確認是否有延誤/停駛，若有給 1 個替代建議\n輸出：重點 1-2 行`
            }
        ];
    }, [displayName, locale, stationId]);

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
                    conversation_id: difyConversationIdRef.current,
                    inputs: {
                        user_profile: userProfile,
                        user_context: userContext,
                        current_station: stationId || '',
                        station_name: displayName,
                        locale,
                        zone: zone || 'core',
                        user_id: difyUserIdRef.current
                    }
                })
            });

            clearInterval(stepInterval);

            if (!response.ok) throw new Error('Network error');
            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';
            let sseBuffer = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            setThinkingStep('');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                while (true) {
                    const newlineIndex = sseBuffer.indexOf('\n');
                    if (newlineIndex === -1) break;

                    const rawLine = sseBuffer.slice(0, newlineIndex);
                    sseBuffer = sseBuffer.slice(newlineIndex + 1);

                    const line = rawLine.trimEnd();
                    if (!line.startsWith('data:')) continue;

                    const payload = line.slice(5).trimStart();
                    if (!payload || payload === '[DONE]') continue;

                    try {
                        const data = JSON.parse(payload);
                        if (data.conversation_id && typeof data.conversation_id === 'string') {
                            difyConversationIdRef.current = data.conversation_id;
                        }
                        if (data.event === 'agent_message' || data.event === 'message') {
                            accumulatedResponse += (data.answer || '');
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[newMsgs.length - 1].content = accumulatedResponse;
                                return newMsgs;
                            });
                        }
                    } catch {
                    }
                }
            }

        } catch (error) {
            console.error('Chat Error:', error);
            setIsOffline(true);
            setMessages(prev => [...prev, { role: 'assistant', content: tL4('chatError') }]);
            clearInterval(stepInterval);
        } finally {
            setIsLoading(false);
            setThinkingStep('');
        }
    }, [displayName, isLoading, locale, stationId, tL4, userContext, zone]);

    useEffect(() => {
        const text = String(seedQuestion || '').trim();
        if (!text) return;
        if (isLoading) return;
        if (lastSeedQuestionRef.current === text) return;

        lastSeedQuestionRef.current = text;
        handleSend(text, seedUserProfile || 'general');
        onSeedConsumed?.();
    }, [seedQuestion, seedUserProfile, isLoading, handleSend, onSeedConsumed]);

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
                        <h3 className="font-black text-slate-800 tracking-tight">{tL4('bambiStrategy')}</h3>
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
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                            }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {msg.role === 'user' ? tL4('userLabel') : tL4('bambiLabel')}
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
