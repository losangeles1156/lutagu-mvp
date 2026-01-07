'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useLocale, useTranslations } from 'next-intl';
import {
    MessageSquare,
    Minus,
    Maximize2,
    X,
    MapPin,
    RotateCcw,
    Copy,
    ThumbsUp,
    ThumbsDown,
    Send,
    ChevronDown
} from 'lucide-react';
import { ActionCard, Action as ChatAction } from './ActionCard';
import { ContextSelector } from './ContextSelector';
import { IntentSelector } from './IntentSelector';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 400;

// Helper function to extract station name from node ID
function getStationName(nodeId: string | null): string {
    if (!nodeId) return '';
    // Format: odpt.Station:Operator.Line.StationName
    const parts = nodeId.split('.');
    if (parts.length < 2) return nodeId;
    const stationPart = parts[parts.length - 1];
    // Convert snake_case to readable format
    return stationPart
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function ChatPanel() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tCommon = useTranslations('common');

    const {
        isChatOpen,
        setChatOpen,
        messages,
        addMessage,
        currentNodeId,
        setCurrentNode,
        difyUserId,
        difyConversationId,
        setDifyConversationId,
        userContext,
        userProfile,
        pendingChatInput,
        pendingChatAutoSend,
        setPendingChat,
        resetDifyConversation,
        mapCenter,
        selectedNeed,
    } = useAppStore();

    // [FIX] Lazy initialize difyUserId on client-side to avoid hydration mismatch
    const effectiveDifyUserId = useMemo(() => {
        if (difyUserId) return difyUserId;
        // Generate on client-side only
        if (typeof window !== 'undefined') {
            const newId = globalThis.crypto?.randomUUID?.() ||
                `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            // Store it for future use (this is safe since we're on client)
            useAppStore.setState({ difyUserId: newId });
            return newId;
        }
        return 'ssr-placeholder';
    }, [difyUserId]);

    const { zone } = useZoneAwareness();

    const [input, setInput] = useState('');
    const [l2Status, setL2Status] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(DEFAULT_HEIGHT);
    const hasBootstrappedRef = useRef(false);

    const openingQuickReplies = useMemo(() => {
        if (locale === 'ja') {
            return [
                '今、銀座線は遅延していますか？',
                '浅草から秋葉原まで一番早い行き方は？',
                '神田駅の出口にはエレベーターがありますか？'
            ];
        }
        if (locale === 'en') {
            return [
                'Is the Ginza Line delayed right now?',
                'Fastest way from Asakusa to Akihabara?',
                'Do Kanda Station exits have elevators?'
            ];
        }
        return [
            '現在銀座線有延誤嗎？',
            '從淺草到秋葉原怎麼去最快？',
            '神田站的出口都有電梯嗎？'
        ];
    }, [locale]);

    const openingQuery = useMemo(() => {
        if (locale === 'ja') {
            return '日本語で短い挨拶をして、できることを3つ（運行情報・バリアフリー・代替ルート）箇条書きで示し、最後に「今どこにいるか／どこへ行きたいか」を質問してください。';
        }
        if (locale === 'en') {
            return 'Give a short greeting in English, list 3 things you can help with (live status, accessibility, alternative routes), and end by asking where I am or where I want to go.';
        }
        return '請用繁體中文做開場自我介紹，列出你能幫忙的 3 件事（即時列車狀態、無障礙、替代路線），最後問我現在在哪裡或想去哪裡。';
    }, [locale]);

    const streamFromDify = useCallback(async (payload: {
        query: string;
        includeUserMessage: boolean;
        assistantActions?: ChatAction[];
    }) => {
        if (!payload.query.trim()) return;

        if (payload.includeUserMessage) {
            addMessage({ role: 'user', content: payload.query });
        }

        addMessage({
            role: 'assistant',
            content: '',
            isLoading: true,
            actions: payload.assistantActions
        });

        try {
            const response = await fetch('/api/dify/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: payload.query,
                    conversation_id: difyConversationId,
                    inputs: {
                        user_profile: userProfile || 'general',
                        user_context: userContext || [],
                        current_station: currentNodeId || '',
                        station_name: getStationName(currentNodeId),
                        lat: mapCenter?.lat || null,
                        lng: mapCenter?.lon || null,
                        selected_need: selectedNeed || null,
                        locale,
                        zone: zone || 'core',
                        user_id: effectiveDifyUserId
                    }
                })
            });

            if (!response.ok) throw new Error('API Error');
            if (!response.body) throw new Error('No response body');

            setIsOffline(false);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedAnswer = '';
            let sseBuffer = '';

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

                    const ssePayload = line.slice(5).trimStart();
                    if (!ssePayload || ssePayload === '[DONE]') continue;

                    try {
                        const data = JSON.parse(ssePayload);
                        if (data.conversation_id && typeof data.conversation_id === 'string') {
                            setDifyConversationId(data.conversation_id);
                        }

                        if (data.event === 'agent_message' || data.event === 'message') {
                            accumulatedAnswer += (data.answer || '');

                            useAppStore.setState(state => {
                                const newMessages = [...state.messages];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    lastMsg.content = accumulatedAnswer;
                                    lastMsg.isLoading = false;
                                }
                                return { messages: newMessages };
                            });
                        }
                    } catch (parseError) {
                        // [FIX] Log but don't crash - malformed SSE chunks are common during network issues
                        console.warn('[ChatPanel] SSE parse error (non-fatal):', parseError);
                        // Don't update state here - let the stream continue
                    }
                }
            }
        } catch (error) {
            console.error('Chat Error', error);
            setIsOffline(true);
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
    }, [addMessage, currentNodeId, difyConversationId, effectiveDifyUserId, locale, tChat, setDifyConversationId, zone, userContext, userProfile, mapCenter, selectedNeed]);

    const sendMessage = useCallback(async (text: string) => {
        await streamFromDify({ query: text, includeUserMessage: true });
    }, [streamFromDify]);

    // Bootstrap conversation
    useEffect(() => {
        if (!isChatOpen) {
            hasBootstrappedRef.current = false;
            return;
        }
        if (messages.length > 0) return;
        if (pendingChatInput) return;
        if (hasBootstrappedRef.current) return;

        hasBootstrappedRef.current = true;

        const actions = openingQuickReplies.map(q => ({
            type: 'discovery' as const,
            label: q,
            target: `chat:${encodeURIComponent(q)}`
        }));

        streamFromDify({
            query: openingQuery,
            includeUserMessage: false,
            assistantActions: actions
        });
    }, [isChatOpen, messages.length, openingQuery, openingQuickReplies, pendingChatInput, streamFromDify]);

    // Fetch L2 status
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
                }
            } catch (e) {
                console.error('L2 Fetch Error', e);
            }
        };
        if (isChatOpen) fetchL2();
    }, [isChatOpen, currentNodeId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle pending input
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

    // Handle resize
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartY.current = e.clientY;
        resizeStartHeight.current = height;
    }, [height]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - resizeStartY.current;
            const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartHeight.current - deltaY));
            setHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const text = input;
        setInput('');
        await sendMessage(text);
    };

    // Handle action
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
                useAppStore.getState().setBottomSheetOpen(true);
                setChatOpen(false);
            }
        } else if (action.type === 'trip') {
            addMessage({ role: 'assistant', content: `✅ ${tChat('tripAdded', { label: action.label })}` });
        } else if (action.type === 'discovery') {
            if (action.target?.startsWith('chat:')) {
                const q = decodeURIComponent(action.target.slice('chat:'.length));
                sendMessage(q);
            } else if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            }
        }
    };

    // Handle feedback
    const handleFeedback = async (index: number, score: number) => {
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant') return;

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
                    messageId: `msg-${Date.now()}-${index}`,
                    sessionId: 'current-session',
                    details: {
                        content: msg.content,
                        nodeId: currentNodeId
                    }
                })
            });
        } catch (e) {
            console.error('Feedback Error', e);
        }
    };

    // Handle restart conversation
    const handleRestart = useCallback(() => {
        resetDifyConversation();
        useAppStore.getState().messages = [];
        hasBootstrappedRef.current = false;
    }, [resetDifyConversation]);

    // Handle back to map
    const handleBackToMap = useCallback(() => {
        setChatOpen(false);
    }, [setChatOpen]);

    if (!isChatOpen) return null;

    return (
        <div
            ref={containerRef}
            className={`
                flex flex-col bg-white border-l border-slate-200
                transition-all duration-300 ease-out
                ${isMaximized ? 'fixed inset-0 z-50' : ''}
            `}
            style={isMaximized ? {} : { height }}
        >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBackToMap}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={tCommon('back')}
                    >
                        <MapPin size={18} className="text-indigo-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
                                ✨
                            </div>
                            <div className="font-black text-sm text-slate-900">LUTAGU AI</div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRestart}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={tChat('restart')}
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={tChat('minimize')}
                    >
                        <Minus size={16} />
                    </button>
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={tChat('maximize')}
                    >
                        <Maximize2 size={16} />
                    </button>
                    <button
                        onClick={() => setChatOpen(false)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={tCommon('close')}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Minimized State */}
            {isMinimized ? (
                <div className="flex-1 flex items-center justify-center py-8">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="flex flex-col items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-6 py-4 rounded-2xl transition-all min-w-[44px]"
                    >
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
                            ✨
                        </div>
                        <span className="text-xs font-bold">LUTAGU AI</span>
                        <ChevronDown size={20} className="rotate-180" />
                    </button>
                </div>
            ) : (
                <>
                    {/* L2 Status Alert */}
                    {l2Status && (
                        <div className="shrink-0 px-4 py-2 bg-rose-50/80 border-b border-rose-100">
                            <div className="flex items-start gap-2">
                                <span className="text-rose-500">⚠️</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-rose-700 truncate">
                                        {l2Status.reason_zh_tw || l2Status.reason_ja}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                                    max-w-[85%] p-4 rounded-2xl shadow-sm
                                    ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg'
                                        : 'bg-white text-slate-800 rounded-bl-lg border border-slate-100'
                                    }
                                `}>
                                    {msg.isLoading ? (
                                        <div className="flex space-x-2 items-center h-6">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {msg.content}
                                            </div>

                                            {/* Action Cards */}
                                            {msg.actions && msg.actions.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {msg.actions.map((action, i) => (
                                                        <ActionCard
                                                            key={i}
                                                            action={action}
                                                            onClick={handleAction}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Feedback Buttons */}
                                            {msg.role === 'assistant' && !msg.isLoading && msg.content && (
                                                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100/50">
                                                    <button
                                                        onClick={() => handleFeedback(idx, 1)}
                                                        disabled={!!msg.feedback}
                                                        className={`p-1.5 rounded-full transition-all ${msg.feedback?.score === 1
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'hover:bg-slate-100 text-slate-300 hover:text-emerald-500'
                                                            }`}
                                                        title={tChat('feedbackLike')}
                                                    >
                                                        <ThumbsUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(idx, -1)}
                                                        disabled={!!msg.feedback}
                                                        className={`p-1.5 rounded-full transition-all ${msg.feedback?.score === -1
                                                            ? 'bg-rose-100 text-rose-600'
                                                            : 'hover:bg-slate-100 text-slate-300 hover:text-rose-500'
                                                            }`}
                                                        title={tChat('feedbackDislike')}
                                                    >
                                                        <ThumbsDown size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Intent & Context Selectors */}
                    <div className="shrink-0 px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                        <IntentSelector />
                        <ContextSelector />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={tChat('placeholder')}
                                className="flex-1 px-4 py-3 bg-slate-50 border-0 rounded-xl 
                                    focus:ring-2 focus:ring-indigo-500 focus:bg-white
                                    text-sm font-bold placeholder:text-slate-400
                                    min-h-[48px]"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-xl
                                    hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all active:scale-95 min-w-[48px] min-h-[48px]
                                    flex items-center justify-center"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Resize Handle */}
            {!isMaximized && (
                <div
                    onMouseDown={handleResizeStart}
                    className={`
                        absolute bottom-0 left-0 right-0 h-1 
                        cursor-row-resize flex items-center justify-center
                        hover:bg-indigo-100 transition-colors
                        ${isResizing ? 'bg-indigo-300' : 'bg-transparent'}
                    `}
                >
                    <div className="w-12 h-1 bg-slate-300 rounded-full" />
                </div>
            )}
        </div>
    );
}

export default ChatPanel;
