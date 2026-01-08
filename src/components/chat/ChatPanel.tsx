'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useLocale, useTranslations } from 'next-intl';
import {
    MessageSquare,
    Minus,
    Maximize2,
    X,
    MapPin,
    RotateCcw,
    Send,
    ThumbsUp,
    ThumbsDown,
    ChevronDown
} from 'lucide-react';
import { ActionCard, Action as ChatAction } from './ActionCard';
import { demoScripts } from '@/data/demoScripts';
import { EmptyState } from './EmptyState';
import { useToast } from '@/components/ui/Toast';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 400;
const MAX_INPUT_LENGTH = 500;

// Helper function to extract station name from node ID
function getStationName(nodeId: string | null): string {
    if (!nodeId) return '';
    const parts = nodeId.split('.');
    if (parts.length < 2) return nodeId;
    const stationPart = parts[parts.length - 1];
    return stationPart
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function ChatPanel() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tCommon = useTranslations('common');

    // 使用新狀態機的狀態
    // 使用新狀態機的狀態 (Navigation)
    const uiState = useUIStateMachine(state => state.uiState);
    const transitionTo = useUIStateMachine(state => state.transitionTo);

    // 從 AppStore 獲取 Chat 狀態與 Demo 狀態
    const messages = useAppStore(state => state.messages);
    const addMessage = useAppStore(state => state.addMessage);
    const clearMessages = useAppStore(state => state.clearMessages);
    const isDemoMode = useAppStore(state => state.isDemoMode);
    const activeDemoId = useAppStore(state => state.activeDemoId);
    const setDemoMode = useAppStore(state => state.setDemoMode);
    const setPendingChat = useAppStore(state => state.setPendingChat);
    const pendingChatInput = useAppStore(state => state.pendingChatInput);
    const pendingChatAutoSend = useAppStore(state => state.pendingChatAutoSend);

    // 從 AppStore 獲取必要狀態
    const difyUserId = useAppStore(state => state.difyUserId);
    const difyConversationId = useAppStore(state => state.difyConversationId);
    const setDifyConversationId = useAppStore(state => state.setDifyConversationId);
    const resetDifyConversation = useAppStore(state => state.resetDifyConversation);
    const currentNodeId = useAppStore(state => state.currentNodeId);
    const setCurrentNode = useAppStore(state => state.setCurrentNode);
    const mapCenter = useAppStore(state => state.mapCenter);
    const selectedNeed = useAppStore(state => state.selectedNeed);

    const effectiveDifyUserId = useMemo(() => {
        if (difyUserId) return difyUserId;
        return 'ssr-placeholder';
    }, [difyUserId]);

    // L3: Toast hook for feedback confirmation
    const showToast = useToast();

    // 產生 difyUserId
    useEffect(() => {
        if (typeof window !== 'undefined' && !difyUserId) {
            const newId = globalThis.crypto?.randomUUID?.() ||
                `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            useAppStore.setState({ difyUserId: newId });
        }
    }, [difyUserId]);

    const { zone } = useZoneAwareness();

    // 內部狀態
    const [input, setInput] = useState('');
    const [l2Status, setL2Status] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);

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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            console.log('[ChatPanel] Sending request to Agent Orchestrator:', payload.query);

            // Format messages for the orchestrator
            const clientMessages = messages.map((m: any) => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    messages: clientMessages.concat(payload.includeUserMessage ? [] : [{ role: 'user', content: payload.query }]),
                    nodeId: currentNodeId || '',
                    locale,
                    userProfile: 'general'
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
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

                        if (data.event !== 'ping') {
                            console.log(`[ChatPanel] Dify Event: ${data.event}`, data.task_id || '');
                        }

                        if (data.conversation_id && typeof data.conversation_id === 'string') {
                            setDifyConversationId(data.conversation_id);
                        }

                        if (data.event === 'agent_message' || data.event === 'message') {
                            accumulatedAnswer += (data.answer || '');
                        }
                    } catch (parseError) {
                        console.warn('[ChatPanel] SSE parse error (non-fatal):', parseError);
                    }
                }
            }
        } catch (error) {
            console.error('Chat Error', error);
            setIsOffline(true);
            addMessage({
                role: 'assistant',
                content: `⚠️ ${tChat('connectionError')}`
            });
        }
    }, [addMessage, currentNodeId, difyConversationId, effectiveDifyUserId, locale, tChat, setDifyConversationId, zone, mapCenter, selectedNeed]);

    const sendMessage = useCallback(async (text: string) => {
        await streamFromDify({ query: text, includeUserMessage: true });
    }, [streamFromDify]);

    // 初始化對話
    useEffect(() => {
        if (uiState !== 'fullscreen') return;

        // 優先處理 pendingChat (演示模式)
        if (pendingChatInput && pendingChatAutoSend) {
            hasBootstrappedRef.current = true;
            const query = pendingChatInput;
            // 清除狀態避免重複觸發
            setPendingChat({ input: null, autoSend: false });
            // 直接發送訊息
            sendMessage(query);
            return;
        }

        // 如果目前沒有訊息，或者只有一條且內容不是開場白，則強制初始化
        const needsInitialization = messages.length === 0 ||
            (messages.length === 1 && !messages[0].content.includes('導航夥伴'));

        if (!needsInitialization) return;
        if (hasBootstrappedRef.current) return;

        hasBootstrappedRef.current = true;

        // 先清空，確保乾淨
        if (messages.length > 0) {
            clearMessages();
        }

        // 參考截圖設計的開場白內容
        const welcomeContent = locale === 'ja'
            ? `こんにちは！あなたの東京交通ナビゲーションパートナーです！\nお手伝いできること：\n🚃 リアルタイムの列車状態と遅延情報\n♿ バリアフリー施設の位置\n🆘 交通異常時の代替ルート提案\n\n今どこにいるか、またはどこへ行きたいか教えてください。`
            : locale === 'en'
                ? `Hello! I am your Tokyo transit navigation partner!\nI can help you with:\n🚃 Real-time train status and delay info\n♿ Accessibility facility locations\n🆘 Alternative route suggestions during disruptions\n\nTell me where you are now, or where you want to go.`
                : `你好！我是你的東京交通導航夥伴！\n我可以幫助你：\n🚃 即時列車狀態與延誤情報\n♿ 無障礙設施位置\n🆘 交通異常時的替代路線建議\n\n請告訴我你現在在哪裡，或是想去哪裡？`;

        const suggestions = locale === 'ja'
            ? ['銀座線は今遅延していますか？', '浅草から秋葉原まで一番早い行き方は？', '神田駅の出口にはエレベーターがありますか？']
            : locale === 'en'
                ? ['Is the Ginza Line delayed right now?', 'Fastest way from Asakusa to Akihabara?', 'Do Kanda Station exits have elevators?']
                : ['現在銀座線有延誤嗎？', '從淺草到秋葉原怎麼去最快？', '神田站的出口都有電梯嗎？'];

        addMessage({
            role: 'assistant',
            content: welcomeContent,
            isLoading: false,
            actions: suggestions.map(q => ({
                type: 'discovery',
                label: q,
                target: `chat:${encodeURIComponent(q)}`
            }))
        });
    }, [uiState, messages.length, locale, addMessage, clearMessages, pendingChatInput, pendingChatAutoSend, setPendingChat, sendMessage]);

    // 獲取 L2 狀態
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
        if (uiState === 'fullscreen') fetchL2();
    }, [uiState, currentNodeId]);

    // 滾動到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 處理調整大小
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
    }, [isResizing, resizeStartY, resizeStartHeight]);

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
            transitionTo('collapsed_desktop');
        } else if (action.type === 'details') {
            if (action.target) {
                setCurrentNode(action.target);
                useAppStore.getState().setBottomSheetOpen(true);
                transitionTo('collapsed_desktop');
            }
        } else if (action.type === 'trip') {
            addMessage({ role: 'assistant', content: `✅ ${tChat('tripAdded', { label: action.label })}` });
        } else if (action.type === 'discovery') {
            if (action.target === 'internal:restart') {
                setDemoMode(false);
                clearMessages();
                hasBootstrappedRef.current = false;
                return;
            }

            if (action.target?.startsWith('chat:')) {
                const q = decodeURIComponent(action.target.slice('chat:'.length));
                sendMessage(q);
            } else if (action.target?.startsWith('http')) {
                window.open(action.target, '_blank');
            }
        }
    };

    // Demo Mode Logic
    useEffect(() => {
        if (uiState !== 'fullscreen') {
            hasBootstrappedRef.current = false;
            return;
        }

        // Check if demo mode is active
        if (isDemoMode && activeDemoId && demoScripts[activeDemoId]) {
            const script = demoScripts[activeDemoId];
            const lang = locale as 'en' | 'ja' | 'zh-TW' | 'zh';

            // Clear existing messages if not already bootstrapped or if unexpected state
            if (!hasBootstrappedRef.current) {
                clearMessages();
                hasBootstrappedRef.current = true;

                // Add User Message
                addMessage({
                    role: 'user',
                    content: script.userMessage[lang]
                });

                // Simulate Assistant Response
                setTimeout(async () => {
                    // 1. Add "thinking" state
                    addMessage({
                        role: 'assistant',
                        content: '',
                        isLoading: true
                    });

                    // 2. Wait for "thinking" delay
                    await new Promise(r => setTimeout(r, 800));

                    // 3. Start typing (Clear loading state first!)
                    useAppStore.setState(state => {
                        const newMessages = [...state.messages];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.isLoading = false;
                        }
                        return { messages: newMessages };
                    });

                    const responseText = script.assistantResponse[lang];
                    let displayedText = '';
                    const chunkSize = 2;

                    for (let i = 0; i < responseText.length; i += chunkSize) {
                        await new Promise(r => setTimeout(r, 20)); // Faster typing
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

                    // 4. Finish stream, add actions
                    useAppStore.setState(state => {
                        const newMessages = [...state.messages];
                        const lastMsg = newMessages[newMessages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
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
                }, 100);
            }
            return;
        }
    }, [isDemoMode, activeDemoId, locale, addMessage, clearMessages, uiState, tChat]);

    const handleFeedback = async (index: number, score: number) => {
        const msg = messages[index];
        if (!msg || msg.role !== 'assistant') return;

        // Optimistic update using useAppStore.setState
        useAppStore.setState(state => {
            const newMessages = [...state.messages];
            if (newMessages[index]) {
                newMessages[index] = { ...newMessages[index], feedback: { score } };
            }
            return { messages: newMessages };
        });

        if (showToast) {
            showToast(tChat('feedbackSent', { defaultValue: '已收到您的回饋！' }), 'success');
        }

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

    const handleRestart = useCallback(() => {
        // backupMessages(); // Removed as we are using appStore directly
        setDemoMode(false);
        resetDifyConversation();
        clearMessages();
        hasBootstrappedRef.current = false;
    }, [resetDifyConversation, clearMessages, setDemoMode]);

    const handleBackToMap = useCallback(() => {
        transitionTo('collapsed_desktop');
    }, [transitionTo]);

    // 全螢幕模式下才渲染
    if (uiState !== 'fullscreen') return null;

    return (
        <div
            ref={containerRef}
            className={`
                flex flex-col bg-white border-l border-slate-200
                transition-all duration-300 ease-out h-full
            `}
            style={{ height: '100%' }}
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
                    <LanguageSwitcher className="p-2 shadow-none glass-effect-none bg-transparent hover:bg-indigo-50 rounded-lg" />
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
                        onClick={handleBackToMap}
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
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" role="log" aria-live="polite">
                        {messages.map((msg: any, idx: number) => (
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

                                            {/* Action Cards / Suggestions */}
                                            {msg.actions && msg.actions.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {msg.actions.map((action: any, i: number) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleAction(action)}
                                                            className="px-4 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                                        >
                                                            {action.label}
                                                        </button>
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
                                                        aria-label={tChat('feedbackLike')}
                                                    >
                                                        <ThumbsUp size={14} aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(idx, -1)}
                                                        disabled={!!msg.feedback}
                                                        className={`p-1.5 rounded-full transition-all ${msg.feedback?.score === -1
                                                            ? 'bg-rose-100 text-rose-600'
                                                            : 'hover:bg-slate-100 text-slate-300 hover:text-rose-500'
                                                            }`}
                                                        aria-label={tChat('feedbackDislike')}
                                                    >
                                                        <ThumbsDown size={14} aria-hidden="true" />
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

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={tChat('placeholder')}
                                    maxLength={MAX_INPUT_LENGTH}
                                    className="w-full px-4 py-3 pr-20 bg-slate-50 border-0 rounded-xl 
                                        focus:ring-2 focus:ring-indigo-500 focus:bg-white
                                        text-base font-bold placeholder:text-slate-400
                                        min-h-[48px]"
                                    autoFocus
                                    aria-label={tChat('placeholder')}
                                    aria-describedby="char-count"
                                />
                                <div
                                    id="char-count"
                                    className={`absolute right-3 bottom-2 text-[10px] font-bold transition-colors
                                        ${input.length >= MAX_INPUT_LENGTH
                                            ? 'text-rose-500'
                                            : input.length >= MAX_INPUT_LENGTH * 0.9
                                                ? 'text-amber-500'
                                                : 'text-slate-300'
                                        }`}
                                    aria-live="polite"
                                >
                                    {input.length}/{MAX_INPUT_LENGTH}
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!input.trim() || input.length > MAX_INPUT_LENGTH}
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
        </div>
    );
}

export default ChatPanel;
