'use client';

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

    // Agent Chat Hook Integration
    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        sendMessage,
        clearMessages,
        messagesEndRef
    } = useAgentChat({
        stationId: currentNodeId || '',
        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
    });

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

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayMessages, isLoading]);

    // Initialize (Welcome Message or Pending Chat or Demo Script)
    useEffect(() => {
        if (uiState !== 'fullscreen') return;
        if (hasBootstrappedRef.current) return;

        // Demo Mode Logic
        if (isDemoMode && activeDemoId && demoScripts[activeDemoId]) {
            hasBootstrappedRef.current = true;
            const script = demoScripts[activeDemoId];
            const lang = (locale === 'ja' || locale === 'en' || locale === 'zh-TW') ? locale : 'zh';

            // 1. Initial User Message
            const initialUserMsg = {
                id: `demo-user-${Date.now()}`,
                role: 'user',
                content: script.userMessage[lang],
                parts: [{ type: 'text', text: script.userMessage[lang] }]
            };

            // Update hook state (for rendering) AND store (for persistence if needed)
            setMessages([initialUserMsg] as any);
            useAppStore.setState({ messages: [initialUserMsg] as any });

            // Simulate Assistant Response
            setTimeout(async () => {
                const assistantMsgId = `demo-assistant-${Date.now()}`;
                const initialAssistantMsg = {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: '', // Start empty
                    parts: [{ type: 'text', text: '' }],
                    isLoading: true // Custom flag (might not directly affect AI SDK but useful for custom logic)
                };

                // Add empty assistant message
                setMessages((prev: any[]) => [...prev, initialAssistantMsg] as any);

                const responseText = script.assistantResponse[lang];
                let displayedText = '';
                const chunkSize = 2; // Char per tick

                for (let i = 0; i < responseText.length; i += chunkSize) {
                    await new Promise(r => setTimeout(r, 30));
                    displayedText += responseText.slice(i, i + chunkSize);

                    // Update streaming text
                    setMessages((prev: any[]) => {
                        const newMessages = [...prev] as any[]; // Cast to any[]
                        const lastMsg = { ...newMessages[newMessages.length - 1] };

                        if (lastMsg.role === 'assistant') {
                            lastMsg.content = displayedText;
                            // AI SDK uses parts for structure sometimes, keep it consistent
                            if (lastMsg.parts && lastMsg.parts[0]) {
                                lastMsg.parts = [{ type: 'text', text: displayedText }];
                            }
                        }
                        newMessages[newMessages.length - 1] = lastMsg;
                        return newMessages;
                    });
                }

                // Finish stream, add actions
                setMessages((prev: any[]) => {
                    const newMessages = [...prev] as any[]; // Cast to any[]
                    const lastMsg = { ...newMessages[newMessages.length - 1] };

                    if (lastMsg.role === 'assistant') {
                        // Attach actions as data (AgentMessage interface supports data)
                        const demoActions = [
                            ...script.actions.map((a: any) => ({
                                ...a,
                                label: a.label[lang]
                            })),
                            {
                                type: 'discovery',
                                label: tChat('restartChat', { defaultValue: 'Restart Chat' }),
                                target: 'internal:restart'
                            }
                        ];
                        // Store actions in 'data' property for MessageBubble to pick up
                        lastMsg.data = { actions: demoActions };
                    }
                    newMessages[newMessages.length - 1] = lastMsg;
                    return newMessages;
                });

            }, 600);
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
    }, [uiState, isDemoMode, pendingChatInput, pendingChatAutoSend, append, setPendingChat, messages.length, activeDemoId, locale, addStoreMessage, tChat, setDemoMode]);

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
        } else if (action.target === 'internal:restart') {
            handleRestart();
        } else if (action.target?.startsWith('chat:')) {
            const q = decodeURIComponent(action.target.slice('chat:'.length));
            append({ role: 'user', content: q });
        }
    };

    const handleFeedback = (index: number, score: number) => {
        showToast?.(tChat('feedbackSent', { defaultValue: 'Feedback sent!' }), 'success');
    };

    const handleRestart = () => {
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
                        <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { sendMessage(input); setInput(''); } }} className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={tChat('placeholder')}
                                maxLength={MAX_INPUT_LENGTH}
                                className="flex-1 px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
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


export default ChatPanel;
