'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useLocale, useTranslations } from 'next-intl';
import { findDemoScenario } from '@/lib/l4/assistantEngine';
import { DEMO_SCENARIOS } from '@/lib/l4/demoScenarios';

import { ActionCard, Action as ChatAction } from './ActionCard';
import { ContextSelector } from './ContextSelector';

export function ChatOverlay() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tHome = useTranslations('Home');
    const tOnboarding = useTranslations('onboarding');
    const tTripGuard = useTranslations('tripGuard');
    const tL2 = useTranslations('l2');
    const {
        isChatOpen,
        setChatOpen,
        messages,
        addMessage,
        currentNodeId,
        setCurrentNode,
        setBottomSheetOpen,
        pendingChatInput,
        pendingChatAutoSend,
        setPendingChat
    } = useAppStore();
    const { zone, userLocation } = useZoneAwareness();
    const [input, setInput] = useState('');
    const [l2Status, setL2Status] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        const existingMessages = useAppStore.getState().messages;
        addMessage({ role: 'user', content: text });

        // Check for Demo Scenario Bypass
        let demoMatch = findDemoScenario(text);
        let stepIndex = 0;

        // If not a direct trigger, check if it's a follow-up step
        if (!demoMatch) {
            for (const d of DEMO_SCENARIOS) {
                const foundIdx = d.steps.findIndex(s => s.user === text);
                if (foundIdx !== -1) {
                    demoMatch = d;
                    stepIndex = foundIdx;
                    break;
                }
            }
        }

        if (demoMatch) {
            addMessage({ role: 'assistant', content: '', isLoading: true });

            // Simulate thinking time
            await new Promise(resolve => setTimeout(resolve, 1200));

            const currentStep = demoMatch.steps[stepIndex];
            let responseText = currentStep.agent;

            // Append tools if present
            if (currentStep.tools && currentStep.tools.length > 0) {
                responseText += `\n\n🛠️ ${tChat('activeBadge')}: ${currentStep.tools.join(', ')}`;
            }

            useAppStore.setState(state => {
                const newMessages = [...state.messages];
                const lastMsg = { ...newMessages[newMessages.length - 1] };
                if (lastMsg.role === 'assistant') {
                    lastMsg.content = responseText;
                    lastMsg.isLoading = false;

                    // Reset actions to avoid duplicates if state update runs twice
                    lastMsg.actions = [];

                    // Add actions from links
                    if (currentStep.links && currentStep.links.length > 0) {
                        lastMsg.actions = currentStep.links.map(l => ({
                            type: 'discovery',
                            label: l.label,
                            target: l.url
                        }));
                    }

                    // Add action for next demo step if available
                    if (demoMatch && stepIndex < demoMatch.steps.length - 1) {
                        const nextStep = demoMatch.steps[stepIndex + 1];
                        lastMsg.actions.push({
                            type: 'discovery',
                            label: `✨ ${nextStep.user} (演示下一步)`,
                            target: `demo_step_${stepIndex + 1}_${demoMatch.id}`
                        });
                    }

                    newMessages[newMessages.length - 1] = lastMsg;
                }
                return { messages: newMessages };
            });
            return;
        }

        // Create a placeholder for the assistant's response
        addMessage({ role: 'assistant', content: '', isLoading: true });

        try {
            // Use Dify Agent endpoint
            const response = await fetch('/api/dify/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: text,
                    inputs: {
                        user_profile: 'general',
                        current_station: currentNodeId || '',
                        locale,
                        zone: zone || 'core'
                    }
                })
            });

            if (!response.ok) throw new Error('API Error');
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedAnswer = '';
            let isFirstChunk = true;

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
                                accumulatedAnswer += (data.answer || '');

                                // Update the last message (assistant) with new content
                                useAppStore.setState(state => {
                                    const newMessages = [...state.messages];
                                    const lastMsg = newMessages[newMessages.length - 1];
                                    if (lastMsg.role === 'assistant') {
                                        lastMsg.content = accumulatedAnswer;
                                        lastMsg.isLoading = false;
                                        // If this is the first chunk, ensure we clear any loading state
                                        if (isFirstChunk) {
                                            isFirstChunk = false;
                                        }
                                    }
                                    return { messages: newMessages };
                                });
                            }
                        } catch (e) {
                            console.error('SSE Parse Error', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Chat Error', error);
            // Update last message to show error
            useAppStore.setState(state => {
                const newMessages = [...state.messages];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.role === 'assistant') {
                    lastMsg.content = `⚠️ ${tChat('connectionError')}`;
                    lastMsg.isLoading = false;
                }
                return { messages: newMessages };
            });
        }
    }, [addMessage, locale, tChat, userLocation, zone, currentNodeId, l2Status]);

    useEffect(() => {
        const fetchL2 = async () => {
            if (!currentNodeId) return;
            try {
                const res = await fetch(`/api/l2/status?station_id=${currentNodeId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setL2Status(data);
                    }
                } else {
                    console.error('[ChatOverlay] L2 Fetch Failed', res.status, res.statusText);
                }
            } catch (e) {
                console.error('L2 Fetch Error', e);
            }
        };
        if (isChatOpen) fetchL2();
    }, [isChatOpen, currentNodeId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!isChatOpen) return;
        if (!pendingChatInput) return;

        const text = pendingChatInput;
        setPendingChat({ input: null, autoSend: false });

        if (pendingChatAutoSend) {
            setInput('');
            sendMessage(text);
            return;
        }

        setInput(text);
    }, [isChatOpen, pendingChatInput, pendingChatAutoSend, sendMessage, setPendingChat]);

    if (!isChatOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const text = input;
        setInput('');
        await sendMessage(text);
    };

    const handleAction = (action: ChatAction) => {
        if (action.type === 'navigate') {
            const targets: Record<string, [number, number]> = {
                'ueno': [35.7141, 139.7774],
                'shibuya': [35.6580, 139.7016],
                'shinjuku': [35.6896, 139.7006]
            };
            const coords = action.metadata?.coordinates || targets[action.target] || [35.6895, 139.6917];
            useAppStore.getState().setMapCenter({ lat: coords[0], lon: coords[1] });
            useAppStore.getState().setChatOpen(false);
        } else if (action.type === 'details') {
            if (action.target) {
                setCurrentNode(action.target);
                setBottomSheetOpen(true);
                setChatOpen(false);
            }
        } else if (action.type === 'trip') {
            addMessage({ role: 'assistant', content: `✅ ${tChat('tripAdded', { label: action.label })}` });
        } else if (action.type === 'taxi') {
            window.open(`https://go.mo-t.com/`, '_blank');
        } else if (action.type === 'discovery') {
            if (action.target?.startsWith('demo_step_')) {
                // Handle Demo Next Steps
                const parts = action.target.split('_');
                const stepIndex = parseInt(parts[2]);
                const demoId = parts.slice(3).join('_');

                const demo = DEMO_SCENARIOS.find(s => s.id === demoId);
                if (demo && demo.steps[stepIndex]) {
                    sendMessage(demo.steps[stepIndex].user);
                }
            } else if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            } else {
                window.open(`https://luup.sc/`, '_blank');
            }
        } else if (action.type === 'transit') {
            if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            } else {
                addMessage({ role: 'assistant', content: tChat('openingTimetable', { label: action.label }) });
            }
        }
    };

    const handleFeedback = async (index: number, score: number) => {
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant') return;

        // Optimistic update
        useAppStore.setState(state => {
            const newMessages = [...state.messages];
            newMessages[index] = { ...msg, feedback: { score } };
            return { messages: newMessages };
        });

        try {
            await fetch('/api/agent/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score,
                    messageId: `msg-${Date.now()}-${index}`, // Simple client-side ID for now
                    sessionId: 'current-session', // Ideally from a session store
                    details: {
                        content: msg.content,
                        nodeId: currentNodeId
                    }
                })
            });
        } catch (e) {
            console.error('Feedback Error', e);
            // Revert if failed (optional, but good practice)
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-700 bg-white/60 backdrop-blur-3xl sm:bg-white/40">
            {/* Header */}
            <div className="p-6 border-b border-black/[0.03] flex justify-between items-center glass-effect sticky top-0 z-10 shadow-sm rounded-b-3xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-indigo-200 text-white transform hover:rotate-6 transition-transform">
                        ✨
                    </div>
                    <div>
                        <h2 className="font-black text-xl tracking-tight text-gray-900 leading-none mb-1.5 text-gradient">LUTAGU AI</h2>
                        <div className="flex items-center gap-2">
                            {isOffline ? (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/80 bg-amber-100/60 px-2 py-1 rounded-full border border-amber-200/60">
                                    {tChat('offlineBadge')}
                                </span>
                            ) : (
                                <>
                                    <span className="relative flex h-2 w-2" aria-hidden="true">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">{tChat('activeBadge')}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setChatOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/50 hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all active:scale-90 shadow-sm border border-black/[0.03]"
                    aria-label={tChat('close')}
                >
                    ✕
                </button>
            </div>

            {/* Trip Guard Entry Point - DISABLED FOR MVP */}
            {/* <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-indigo-600/90 to-indigo-800/90 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-100 border border-white/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl text-white">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100">{tTripGuard('title')}</span>
                        <span className="text-[9px] text-white/60 font-medium">{tTripGuard('subscriptionHint')}</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        useAppStore.getState().setTripGuardActive(true);
                        setChatOpen(false);
                    }}
                    className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-black rounded-full hover:bg-indigo-50 transition-all active:scale-95 shadow-md"
                >
                    {tTripGuard('activate')}
                </button>
            </div> */}

            {/* L2 Live Status Alert */}
            {l2Status && (
                <div className="mx-6 mt-3 p-3 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="p-2 bg-rose-100 text-rose-500 rounded-xl shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">{tL2('operationTitle')}</span>
                            <span className="text-[10px] font-bold text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">{l2Status.weather_info?.temp}°C</span>
                        </div>
                        <p className="text-xs text-rose-900/80 font-bold leading-relaxed line-clamp-2">
                            {l2Status.reason_zh_tw || l2Status.reason_ja}
                        </p>
                        <p className="text-[9px] text-rose-400 font-medium">
                            {tL2('updatedAtPrefix')}: {new Date(l2Status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}
                        </p>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-hide">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-10 px-8 animate-in fade-in zoom-in-95 duration-1000">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 rounded-full animate-pulse" />
                            <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center text-6xl shadow-2xl shadow-indigo-100 border border-white/50 relative z-10 glass-effect">
                                ✨
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{tOnboarding('tagline')}</h3>
                            <p className="text-gray-500 font-bold leading-relaxed max-w-[240px] mx-auto text-sm opacity-60">
                                {tOnboarding('askTitle')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                            {[
                                tOnboarding('tips.overtourism'),
                                tOnboarding('tips.disruption'),
                                tOnboarding('tips.handsfree'),
                                tOnboarding('tips.accessibility')
                            ].map((tip, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(tip)}
                                    className="px-5 py-4 bg-white/40 hover:bg-white border border-white/60 hover:border-indigo-100 rounded-2xl text-sm font-black text-gray-700 hover:text-indigo-600 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex justify-between items-center group backdrop-blur-sm"
                                >
                                    <span className="line-clamp-2">{tip}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-all text-indigo-400 group-hover:translate-x-1 duration-300 ml-2">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 fade-in duration-700`}>
                        <div className={`max-w-[88%] p-5 rounded-[28px] shadow-sm ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg shadow-indigo-200'
                            : 'bg-white text-gray-800 rounded-bl-lg border border-black/[0.03] shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
                            }`}>

                            {msg.isLoading ? (
                                <div className="flex space-x-2 items-center h-6 px-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap leading-relaxed tracking-wide text-sm font-bold opacity-90">
                                    {msg.content}
                                </div>
                            )}

                            {/* Action Cards */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-5 space-y-3">
                                    {msg.actions.map((action: ChatAction, i: number) => (
                                        <ActionCard
                                            key={i}
                                            action={action}
                                            onClick={handleAction}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Feedback Buttons (Assistant only) */}
                            {msg.role === 'assistant' && !msg.isLoading && msg.content && (
                                <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100/80">
                                    <button
                                        onClick={() => handleFeedback(idx, 1)}
                                        disabled={!!msg.feedback}
                                        className={`p-1.5 rounded-full transition-all active:scale-90 ${msg.feedback?.score === 1
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'hover:bg-gray-100 text-gray-300 hover:text-emerald-500'
                                            }`}
                                        title={tChat('feedbackLike')}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                    </button>
                                    <button
                                        onClick={() => handleFeedback(idx, -1)}
                                        disabled={!!msg.feedback}
                                        className={`p-1.5 rounded-full transition-all active:scale-90 ${msg.feedback?.score === -1
                                            ? 'bg-rose-100 text-rose-600'
                                            : 'hover:bg-gray-100 text-gray-300 hover:text-rose-500'
                                            }`}
                                        title={tChat('feedbackDislike')}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Overlay */}
            <div className="p-6 bg-white/40 backdrop-blur-2xl border-t border-black/[0.03] pb-10 shadow-[0_-15px_40px_rgba(0,0,0,0.02)]">
                {/* User Context Selector (Prompt 3) */}
                <div className="mb-4 max-w-2xl mx-auto">
                    <ContextSelector />
                </div>

                <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={tHome('aiPlaceholder')}
                        className="flex-1 px-8 py-5 rounded-full border border-black/[0.05] bg-white/80 hover:bg-white focus:bg-white focus:border-indigo-500/30 focus:ring-[10px] focus:ring-indigo-500/5 transition-all outline-none font-bold placeholder:text-gray-300 text-gray-900 shadow-sm relative z-10"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-2.5 top-2.5 bottom-2.5 aspect-square rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center hover:shadow-xl hover:scale-105 active:scale-90 transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-indigo-200 z-20"
                    >
                        <span className="text-xl -mt-1 font-black">↑</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
