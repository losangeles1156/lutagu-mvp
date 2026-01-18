'use client';

import { logger } from '@/lib/utils/logger';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useLocale, useTranslations } from 'next-intl';
import {
    Minus,
    RotateCcw,
    Send,
    X,
    ThumbsUp,
    ThumbsDown,
    Loader2,
    Brain
} from 'lucide-react';
import { Action as ChatAction, ActionCard } from './ActionCard';
import { EmptyState } from './EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ThinkingBubble } from './ThinkingBubble';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { demoScripts } from '@/data/demoScripts';
import { MessageBubble } from './MessageBubble'; // Moved import to top
import { trackFunnelEvent } from '@/lib/tracking';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 400;
const MAX_INPUT_LENGTH = 500;

export function ChatPanel() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tCommon = useTranslations('common');
    const tL4 = useTranslations('l4');

    // Location Awareness
    const { userLocation } = useZoneAwareness();

    // UI State
    const uiState = useUIStateMachine(state => state.uiState);
    const transitionTo = useUIStateMachine(state => state.transitionTo);

    // App Store State
    const {
        isDemoMode,
        currentNodeId,
        storeMessages,
        addMessage: addStoreMessage,
        clearMessages: clearStoreMessages,
        setPendingChat,
        pendingChatInput,
        pendingChatAutoSend,
        setDemoMode,
        activeDemoId,

        setAgentConversationId,
        agentConversationId,
        agentUserId
    } = useAppStore(state => ({
        isDemoMode: state.isDemoMode,
        activeDemoId: state.activeDemoId,
        setDemoMode: state.setDemoMode,
        currentNodeId: state.currentNodeId,
        setCurrentNode: state.setCurrentNode,
        agentUserId: state.agentUserId,
        agentConversationId: state.agentConversationId,
        setAgentConversationId: state.setAgentConversationId,
        storeMessages: state.messages,
        addMessage: state.addMessage,
        clearMessages: state.clearMessages,
        setPendingChat: state.setPendingChat,
        pendingChatInput: state.pendingChatInput,
        pendingChatAutoSend: state.pendingChatAutoSend,
    }));

    // Toast
    const showToast = useToast();

    // Manage input state
    const [input, setInput] = useState('');
    const [isDemoPlaying, setIsDemoPlaying] = useState(false);

    // Agent Chat Hook Integration
    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        sendMessage,
        clearMessages,
        messagesEndRef,
        sessionId
    } = useAgentChat({
        stationId: currentNodeId || '',
        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
    });

    useAiResponseTracking(messages, isLoading);

    // Compatibility alias
    const append = useCallback(async (msg: { role: string; content: string }) => {
        await sendMessage(msg.content);
    }, [sendMessage]);

    const displayMessages = messages;

    // Panel UI State
    const [isMinimized, setIsMinimized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(DEFAULT_HEIGHT);
    const hasBootstrappedRef = useRef(false);
    const demoRunTokenRef = useRef(0);

    const sleep = useCallback((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), []);

    const resolveLang = useCallback(() => {
        return (locale === 'ja' || locale === 'en' || locale === 'zh-TW') ? locale : 'zh';
    }, [locale]);

    const renderDemoTemplate = useCallback((template: string, vars: Record<string, string>) => {
        return template
            .replace(/\{\{\s*time\s*\}\}/g, vars.time ?? '')
            .replace(/\{\{\s*weather\s*\}\}/g, vars.weather ?? '');
    }, []);

    const updateAssistantMessage = useCallback((assistantMsgId: string, content: string, isLoading: boolean, data?: any) => {
        setMessages((prev: any[]) => {
            const next = prev.map((m: any) => {
                if (m.id !== assistantMsgId) return m;
                const nextMsg = { ...m, content, isLoading };
                if (nextMsg.parts && nextMsg.parts[0]) {
                    nextMsg.parts = [{ type: 'text', text: content }];
                }
                if (data) nextMsg.data = data;
                return nextMsg;
            });
            return next as any;
        });
    }, [setMessages]);

    const runDemoPlayback = useCallback(async (demoId: string) => {
        const script = demoScripts[demoId];
        if (!script) return;

        const lang = resolveLang();
        const token = ++demoRunTokenRef.current;

        setIsDemoPlaying(true);
        setMessages([] as any);
        useAppStore.setState({ messages: [] as any });

        const vars = {
            time: script.mockContext?.time?.[lang] ?? '',
            weather: script.mockContext?.weather?.[lang] ?? ''
        };

        const rounds = Array.isArray((script as any).rounds) ? (script as any).rounds : [];

        for (const round of rounds) {
            if (demoRunTokenRef.current !== token) return;

            const userText = round.userMessage?.[lang] ?? '';
            const userMsg = {
                id: `demo-${demoId}-r${round.roundNumber}-user-${Date.now()}`,
                role: 'user',
                content: userText,
                parts: [{ type: 'text', text: userText }]
            };

            setMessages((prev: any[]) => [...prev, userMsg] as any);
            await sleep(450);
            if (demoRunTokenRef.current !== token) return;

            const assistantMsgId = `demo-${demoId}-r${round.roundNumber}-assistant-${Date.now()}`;
            const assistantMsg = {
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                parts: [{ type: 'text', text: '' }],
                isLoading: true
            };
            setMessages((prev: any[]) => [...prev, assistantMsg] as any);

            const responseTemplate = round.assistantResponse?.[lang] ?? '';
            const responseText = renderDemoTemplate(responseTemplate, vars);
            let displayedText = '';
            const chunkSize = 2;

            for (let i = 0; i < responseText.length; i += chunkSize) {
                if (demoRunTokenRef.current !== token) return;
                await sleep(30);
                displayedText += responseText.slice(i, i + chunkSize);
                updateAssistantMessage(assistantMsgId, displayedText, true);
            }

            const roundActions = Array.isArray(round.actions) ? round.actions : [];
            const localizedRoundActions = roundActions.map((a: any) => ({
                ...a,
                label: a.label?.[lang] ?? a.label
            }));

            const isLastRound = round.roundNumber === 3;
            const endActions = isLastRound ? [
                {
                    type: 'discovery',
                    label: lang === 'ja'
                        ? 'この条件で旅を始める'
                        : lang === 'en'
                            ? 'Start planning with LUTAGU'
                            : lang === 'zh-TW'
                                ? '用這個情境開始規劃'
                                : '用这个情境开始规划',
                    target: 'internal:end-demo',
                    metadata: { category: 'cta' }
                },
                {
                    type: 'discovery',
                    label: lang === 'ja'
                        ? 'デモをもう一度見る'
                        : lang === 'en'
                            ? 'Replay demo'
                            : lang === 'zh-TW'
                                ? '重新播放示範'
                                : '重新播放示范',
                    target: 'internal:restart-demo',
                    metadata: { category: 'cta' }
                }
            ] : [];

            updateAssistantMessage(
                assistantMsgId,
                displayedText,
                false,
                (localizedRoundActions.length > 0 || endActions.length > 0)
                    ? { actions: [...localizedRoundActions, ...endActions] }
                    : undefined
            );

            await sleep(typeof round.pauseAfterMs === 'number' ? round.pauseAfterMs : 650);
        }

        if (demoRunTokenRef.current === token) {
            setIsDemoPlaying(false);
        }
    }, [renderDemoTemplate, resolveLang, setMessages, sleep, updateAssistantMessage]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages, isLoading, messagesEndRef]);

    // Initialize (Welcome Message or Pending Chat or Demo Script)
    useEffect(() => {
        if (uiState !== 'fullscreen') return;
        if (hasBootstrappedRef.current) return;

        // Demo Mode Logic
        if (isDemoMode && activeDemoId && demoScripts[activeDemoId]) {
            hasBootstrappedRef.current = true;
            runDemoPlayback(activeDemoId);
            return;
        }

        // Handle Pending Chat (from Demo/Quick Start)
        if (pendingChatInput && pendingChatAutoSend) {
            hasBootstrappedRef.current = true;
            append({ role: 'user', content: pendingChatInput });
            setPendingChat({ input: null, autoSend: false });
            return;
        }

        // Only bootstrap if completely empty and not in demo mode
        if (messages.length === 0 && !isDemoMode) {
            hasBootstrappedRef.current = true;
        }
    }, [uiState, isDemoMode, activeDemoId, pendingChatInput, pendingChatAutoSend, append, setPendingChat, messages.length, runDemoPlayback]);

    // Handle Resize
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
            setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartHeight.current - deltaY)));
        };
        const handleMouseUp = () => setIsResizing(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Handlers
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
            trackFunnelEvent({
                step_name: 'location_selected',
                step_number: 3,
                path: '/chat',
                metadata: { target: action.target }
            });
        } else if (action.target === 'internal:restart') {
            handleRestart();
        } else if (action.target === 'internal:end-demo') {
            demoRunTokenRef.current++;
            setIsDemoPlaying(false);
            clearMessages();
            clearStoreMessages();
            setDemoMode(false);
            hasBootstrappedRef.current = false;
        } else if (action.target === 'internal:restart-demo') {
            demoRunTokenRef.current++;
            hasBootstrappedRef.current = true;
            if (activeDemoId) runDemoPlayback(activeDemoId);
        } else if (action.target?.startsWith('chat:')) {
            const q = decodeURIComponent(action.target.slice('chat:'.length));
            append({ role: 'user', content: q });
        }
    };

    const handleFeedback = async (index: number, score: number) => {
        const msg = displayMessages[index];

        try {
            const response = await fetch('/api/agent/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score,
                    messageId: msg.id || `msg-${index}`,
                    sessionId: sessionId,
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            showToast?.(tChat('feedbackSent', { defaultValue: 'Feedback sent!' }), 'success');
        } catch (error) {
            logger.error('Feedback submission failed:', error);
            showToast?.(tChat('feedbackError', { defaultValue: 'Failed to send feedback' }), 'error');
        }
    };

    const handleRestart = () => {
        demoRunTokenRef.current++;
        setIsDemoPlaying(false);
        clearMessages();
        clearStoreMessages();
        setDemoMode(false);
        hasBootstrappedRef.current = false;
    };

    if (uiState !== 'fullscreen') return null;

    return (
        <div
            ref={containerRef}
            className="flex flex-col bg-white border-l border-slate-200 transition-all duration-300 ease-out h-full"
            style={{ height: '100%' }}
        >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm shadow-md">
                            ✨
                        </div>
                        <div className="font-black text-sm text-slate-900">LUTAGU AI {isDemoMode ? '(Demo)' : ''}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <LanguageSwitcher className="p-2 shadow-none glass-effect-none bg-transparent hover:bg-indigo-50 rounded-lg" />
                    <button onClick={handleRestart} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><RotateCcw size={16} /></button>
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><Minus size={16} /></button>
                    <button onClick={() => transitionTo('collapsed_desktop')} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><X size={16} /></button>
                </div>
            </div>

            {/* Content */}
            {isMinimized ? (
                <div className="flex-1 flex items-center justify-center py-8">
                    <button onClick={() => setIsMinimized(false)} className="flex flex-col items-center gap-2 text-indigo-600">
                        <span className="text-xs font-bold">Open Chat</span>
                    </button>
                </div>
            ) : (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {displayMessages.length === 0 && !isLoading && !isDemoMode && (
                            <EmptyState onSend={(text) => append({ role: 'user', content: text })} />
                        )}

                        {displayMessages.map((msg: any, idx: number) => (
                            <MessageBubble
                                key={msg.id || idx}
                                msg={msg}
                                idx={idx}
                                handleAction={handleAction}
                                handleFeedback={handleFeedback}
                            />
                        ))}

                        {/* Loading Indicator for Streaming or Thinking */}
                        {/* We show this if:
                            1. System is loading (isLoading) AND last message is NOT assistant (waiting for start)
                            2. OR we have an explicit thinkingStep (e.g. from hook or hybrid engine)
                        */}
                        {(isLoading || thinkingStep) && (
                            displayMessages.length === 0 ||
                            displayMessages[displayMessages.length - 1]?.role !== 'assistant' ||
                            !displayMessages[displayMessages.length - 1]?.content
                        ) && (
                                <div className="flex justify-start">
                                    <ThinkingBubble content={thinkingStep || tL4('thinking.initializing')} isThinking={true} />
                                </div>
                            )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (isDemoPlaying) return;
                            if (input.trim()) {
                                const query = input;
                                sendMessage(input);
                                setInput('');
                                trackFunnelEvent({
                                    step_name: 'query_input',
                                    step_number: 1,
                                    path: '/chat',
                                    metadata: { query_length: query.length }
                                });
                            }
                        }} className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={tChat('placeholder')}
                                maxLength={MAX_INPUT_LENGTH}
                                disabled={isDemoPlaying}
                                className="flex-1 px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                            <button
                                type="submit"
                                disabled={isDemoPlaying || !input.trim() || isLoading}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </>
            )}
            {/* Resize Handle */}
            <div onMouseDown={handleResizeStart} className={`absolute bottom-0 left-0 right-0 h-1 cursor-row-resize ${isResizing ? 'bg-indigo-300' : 'bg-transparent'}`} />
        </div>
    );
}

// Effect for tracking AI response
const useAiResponseTracking = (messages: any[], isLoading: boolean) => {
    const lastMsgRef = useRef<string | null>(null);

    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];

        // Track when assistant message is done loading
        if (lastMsg.role === 'assistant' && !isLoading && !lastMsg.isLoading && lastMsg.id !== lastMsgRef.current) {
            lastMsgRef.current = lastMsg.id;
            trackFunnelEvent({
                step_name: 'ai_response_received',
                step_number: 2,
                path: '/chat',
                metadata: {
                    message_id: lastMsg.id,
                    has_actions: !!lastMsg.data?.actions
                }
            });
        }
    }, [messages, isLoading]);
};

export default ChatPanel;
