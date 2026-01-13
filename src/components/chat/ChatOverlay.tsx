'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useLocale, useTranslations } from 'next-intl';
import { useAgentChat } from '@/hooks/useAgentChat';
import { ActionCard, Action as ChatAction } from './ActionCard';
import { ContextSelector } from './ContextSelector';
import { demoScripts } from '@/data/demoScripts';

export function buildL2StatusUrl(stationId: string) {
    return `/api/l2/status?station_id=${encodeURIComponent(stationId)}`;
}

export function ChatOverlay() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tHome = useTranslations('Home');
    const tL2 = useTranslations('l2');
    const {
        isChatOpen,
        setChatOpen,
        messages: storeMessages,
        addMessage: addStoreMessage,
        clearMessages: clearStoreMessages,
        currentNodeId,
        setCurrentNode,
        setBottomSheetOpen,
        agentUserId,
        agentConversationId,
        setAgentConversationId,
        userContext,
        userProfile,
        pendingChatInput,
        pendingChatAutoSend,
        setPendingChat,
        isDemoMode,
        activeDemoId,
        setDemoMode
    } = useAppStore();

    const { zone } = useZoneAwareness();
    const [l2Status, setL2Status] = useState<any>(null);
    const prevContextRef = useRef<string[]>(userContext);
    const hasBootstrappedRef = useRef(false);
    const [input, setInput] = useState('');
    const [isOfflineLocal, setIsOfflineLocal] = useState(false);

    // AI SDK v6 transport-based architecture
    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        sendMessage,
        clearMessages,
        messagesEndRef,
        isOffline: isOfflineFromHook,
    } = useAgentChat({
        stationId: currentNodeId || '',
        userLocation: undefined, // Add if needed
    });

    const isOffline = isOfflineLocal || isOfflineFromHook;

    const displayMessages = messages;

    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Monitor context changes for UI feedback
    useEffect(() => {
        if (!isChatOpen) return;

        const prev = prevContextRef.current;
        if (JSON.stringify(prev) === JSON.stringify(userContext)) return;

        // Find what changed
        const added = userContext.filter((x: string) => !prev.includes(x));
        const removed = prev.filter((x: string) => !userContext.includes(x));

        const contextLabels: Record<string, string> = {
            'luggage': tChat('contextLuggage', { defaultValue: '大型行李' }),
            'stroller': tChat('contextStroller', { defaultValue: '推嬰兒車' }),
            'accessibility': tChat('contextAccessibility', { defaultValue: '行動不便' }),
            'rush': tChat('contextRush', { defaultValue: '趕時間' })
        };

        if (added.length > 0) {
            setStatusMessage(`✨ AI 已同步您的需求：${added.map((id: string) => contextLabels[id] || id).join(', ')}`);
        } else if (removed.length > 0) {
            setStatusMessage(`🔄 AI 已更新您的需求`);
        }

        prevContextRef.current = userContext;

        const timer = setTimeout(() => setStatusMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [userContext, isChatOpen, tChat]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setIsOfflineLocal(false);
        await sendMessage(text);
    }, [sendMessage]);

    useEffect(() => {
        if (!isChatOpen) {
            hasBootstrappedRef.current = false;
            return;
        }

        // Demo Mode Logic
        if (isDemoMode && activeDemoId && demoScripts[activeDemoId]) {
            const script = demoScripts[activeDemoId];
            const lang = (locale === 'ja' || locale === 'en' || locale === 'zh-TW') ? locale : 'zh';

            // Clear messages and add user message
            useAppStore.setState({
                messages: [{
                    role: 'user',
                    content: script.userMessage[lang]
                }]
            });

            // Simulate Assistant Response
            setTimeout(async () => {
                addStoreMessage({
                    role: 'assistant',
                    content: '',
                    isLoading: true
                });

                const responseText = script.assistantResponse[lang];
                let displayedText = '';
                const chunkSize = 2;

                for (let i = 0; i < responseText.length; i += chunkSize) {
                    await new Promise(r => setTimeout(r, 30));
                    displayedText += responseText.slice(i, i + chunkSize);

                    useAppStore.setState(state => {
                        const newMessages = [...state.messages];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content = displayedText;
                        }
                        return { messages: newMessages };
                    });
                }

                // Finish stream, add actions
                useAppStore.setState(state => {
                    const newMessages = [...state.messages];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.isLoading = false;
                        lastMsg.actions = [
                            ...script.actions.map(a => ({
                                ...a,
                                label: a.label[lang]
                            })),
                            {
                                type: 'discovery',
                                label: tChat('restartChat'), // Use translation key
                                target: 'internal:restart'
                            }
                        ];
                    }
                    return { messages: newMessages };
                });
            }, 600);

            return;
        }

        // 如果目前沒有訊息，強制初始化歡迎訊息
        const currentMessages = messages;

        // Skip if: already has messages, pending input, or already bootstrapped
        if (currentMessages.length > 0 && hasBootstrappedRef.current) return;
        if (pendingChatInput) return;
        if (hasBootstrappedRef.current) return;

        hasBootstrappedRef.current = true;

        // 參考截圖設計的開場白內容
        const welcomeContent = locale === 'ja'
            ? `こんにちは！あなたの東京交通ナビゲーションパートナーです！\nお手伝いできること：\n🚃 リアルタイムの列車状態と遅延情報\n♿ バリアフリー施設の位置\n🆘 交通異常時の代替ルート提案\n\n今どこにいるか、またはどこへ行きたいか教えてください。`
            : locale === 'en'
                ? `Hello! I am your Tokyo transit navigation partner!\nI can help you with:\n🚃 Real-time train status and delay info\n♿ Accessibility facility locations\n🆘 Alternative route suggestions during disruptions\n\nTell me where you are now, or where you want to go.`
                : `你好！我是你的東京交通導覽夥伴！\n我可以幫助你：\n🚃 即時列車狀態與延誤情報\n♿ 無障礙設施位置\n🆘 交通異常時的替代路線建議\n\n請告訴我你現在在哪裡，或是想去哪裡？`;

        const suggestions = locale === 'ja'
            ? ['銀座線は今遅延していますか？', '浅草から秋葉原まで一番早い行き方は？', '神田駅の出口にはエレベーターがありますか？']
            : locale === 'en'
                ? ['Is the Ginza Line delayed right now?', 'Fastest way from Asakusa to Akihabara?', 'Do Kanda Station exits have elevators?']
                : ['現在銀座線有延誤嗎？', '從淺草到秋葉原怎麼去最快？', '神田站的出口都有電梯嗎？'];

        const welcomeMessage: any = {
            id: 'welcome',
            role: 'assistant',
            content: welcomeContent,
            parts: [{ type: 'text', text: welcomeContent }],
            isLoading: false,
            actions: suggestions.map(q => ({
                type: 'discovery',
                label: q,
                target: `chat:${encodeURIComponent(q)}`
            }))
        };

        console.log('[ChatOverlay] Initializing welcome message for', isDemoMode ? 'Demo Mode' : 'AI Mode');

        if (isDemoMode) {
            clearStoreMessages();
            addStoreMessage(welcomeMessage);
        } else {
            setMessages([welcomeMessage]);
        }
    }, [isChatOpen, storeMessages, messages, locale, addStoreMessage, clearStoreMessages, isDemoMode, activeDemoId, pendingChatInput, setMessages, tChat]);

    useEffect(() => {
        if (!isChatOpen) return;
        if (!currentNodeId) return;

        const controller = new AbortController();
        const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), 15000);

        const fetchL2 = async () => {
            try {
                const res = await fetch(buildL2StatusUrl(currentNodeId), {
                    signal: controller.signal,
                    cache: 'no-store'
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data) setL2Status(data);
                    return;
                }

                console.error('[ChatOverlay] L2 Fetch Failed', res.status, res.statusText);
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                console.error('[ChatOverlay] L2 Fetch Error', e);
            }
        };

        fetchL2();
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [isChatOpen, currentNodeId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages]);

    useEffect(() => {
        if (!isChatOpen) return;
        if (isDemoMode) return; // Block pending chat in demo mode
        if (!pendingChatInput) return;

        const text = pendingChatInput;
        setPendingChat({ input: null, autoSend: false });

        if (pendingChatAutoSend) {
            setInput('');
            sendMessage(text);
            return;
        }

        setInput(text);
    }, [isChatOpen, pendingChatInput, pendingChatAutoSend, sendMessage, setPendingChat, isDemoMode]);

    if (!isChatOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const text = input;
        setInput('');
        await sendMessage(text);
    };

    const handleAction = (action: ChatAction) => {
        // Handle internal restart action for demo mode
        if (action.target === 'internal:restart') {
            setDemoMode(false);
            clearMessages();
            hasBootstrappedRef.current = false;
            return;
        }

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
            const content = `✅ ${tChat('tripAdded', { label: action.label })}`;
            if (isDemoMode) {
                addStoreMessage({ role: 'assistant', content });
            } else {
                setMessages((prev: any[]) => [...prev, { id: Date.now().toString(), role: 'assistant', content, parts: [{ type: 'text', text: content }] } as any]);
            }
        } else if (action.type === 'taxi') {
            window.open(`https://go.mo-t.com/`, '_blank');
        } else if (action.type === 'discovery') {
            if (action.target?.startsWith('chat:')) {
                const q = decodeURIComponent(action.target.slice('chat:'.length));
                handleSendMessage(q);
            } else if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            } else {
                window.open(`https://luup.sc/`, '_blank');
            }
        } else if (action.type === 'transit') {
            if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            } else {
                const content = tChat('openingTimetable', { label: action.label });
                if (isDemoMode) {
                    addStoreMessage({ role: 'assistant', content });
                } else {
                    setMessages((prev: any[]) => [...prev, { id: Date.now().toString(), role: 'assistant', content, parts: [{ type: 'text', text: content }] } as any]);
                }
            }
        }
    };



    const handleFeedback = async (index: number, score: number) => {
        const msg = (displayMessages as any[])[index];
        if (!msg || msg.role !== 'assistant') return;

        // Optimistic update
        if (isDemoMode) {
            useAppStore.setState(state => {
                const newMessages = [...state.messages];
                newMessages[index] = { ...msg, feedback: { score } };
                return { messages: newMessages };
            });
        } else {
            setMessages((prev: any[]) => {
                const next = [...prev];
                next[index] = { ...msg, feedback: { score } } as any;
                return next;
            });
        }

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
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-hide" role="log" aria-live="polite">
                {displayMessages.map((msg: any, idx: number) => (
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
                                    {msg.content || (msg.parts && (msg.parts as any[]).find(p => p.type === 'text')?.text)}
                                </div>
                            )}

                            {/* Action Cards / Suggestions */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {msg.actions.map((action: ChatAction, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAction(action)}
                                            className="px-4 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Feedback Buttons (Assistant only) */}
                            {msg.role === 'assistant' && (msg.isLoading || msg.content) && (
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
                {/* Status Message Overlay */}
                {statusMessage && (
                    <div className="max-w-2xl mx-auto mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-200/50 w-fit mx-auto border border-white/20">
                            {statusMessage}
                        </div>
                    </div>
                )}

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
