'use client';

import { logger } from '@/lib/utils/logger';
import { useMapStore } from '@/stores/mapStore';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
// ReactMarkdown and remarkGfm removed as they are unused directly here (logic moved to MessageBubble)

import { useUIStore } from '@/stores/uiStore';
import { useNodeStore } from '@/stores/nodeStore';
import { useUserStore } from '@/stores/userStore';

import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAgentChatContext } from '@/providers/AgentChatProvider';
import { useLocale, useTranslations } from 'next-intl';
import { Action as ChatAction } from './ActionCard';
import { EmptyState } from './EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ThinkingBubble } from './ThinkingBubble';
import { demoScripts } from '@/data/demoScripts';
import { MessageBubble } from './MessageBubble';
import { trackFunnelEvent } from '@/lib/tracking';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { SkeletonMessageBubble } from './SkeletonMessageBubble';
import { useDemoPlayback } from '@/hooks/useDemoPlayback';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 400;

// Hoist targets constant outside component
const TARGETS: Record<string, [number, number]> = {
    'ueno': [35.7141, 139.7774],
    'shibuya': [35.6580, 139.7016],
    'shinjuku': [35.6896, 139.7006]
};

const DEFAULT_COORDS: [number, number] = [35.6895, 139.6917];

export function ChatPanel() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tL4 = useTranslations('l4');

    // Location Awareness
    const { userLocation } = useZoneAwareness();

    // UI State
    const uiState = useUIStateMachine(state => state.uiState);
    const transitionTo = useUIStateMachine(state => state.transitionTo);

    // App Store State
    const isDemoMode = useUIStore(s => s.isDemoMode);
    const activeDemoId = useUIStore(s => s.activeDemoId);
    const setDemoMode = useUIStore(s => s.setDemoMode);

    const currentNodeId = useNodeStore(s => s.currentNodeId);

    const storeMessages = useUIStore(s => s.messages);
    const clearStoreMessages = useUIStore(s => s.clearMessages);
    const setPendingChat = useUIStore(s => s.setPendingChat);
    const pendingChatInput = useUIStore(s => s.pendingChatInput);
    const pendingChatAutoSend = useUIStore(s => s.pendingChatAutoSend);

    const showToast = useToast();


    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        sendMessage,
        clearMessages,
        messagesEndRef,
        sessionId
    } = useAgentChatContext();

    // Debug message log
    if (typeof window !== 'undefined') {
        console.log(`[DEBUG ChatPanel] messages count: ${messages?.length || 0}`);
    }

    useAiResponseTracking(messages, isLoading);

    // Compatibility alias
    const append = useCallback(async (msg: { role: string; content: string }) => {
        await sendMessage(msg.content);
    }, [sendMessage]);

    // Panel UI State
    const [isMinimized, setIsMinimized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const resizeStartY = useRef(0);
    const resizeStartHeight = useRef(DEFAULT_HEIGHT);
    const hasBootstrappedRef = useRef(false);

    const { startPlayback, stopPlayback, isDemoPlaying } = useDemoPlayback({
        setMessages,
        onPlaybackComplete: () => {
            // Optional callback
        }
    });

    const runDemoPlayback = startPlayback;

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading, messagesEndRef]);

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
    const handleRestart = useCallback(() => {
        stopPlayback();
        clearMessages();
        clearStoreMessages();
        setDemoMode(false);
        hasBootstrappedRef.current = false;
    }, [clearMessages, clearStoreMessages, setDemoMode, stopPlayback]);

    const handleAction = useCallback((action: ChatAction) => {
        if (action.type === 'navigate') {
            const coords = action.metadata?.coordinates || TARGETS[action.target] || DEFAULT_COORDS;
            useMapStore.getState().setMapCenter({ lat: coords[0], lon: coords[1] });
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
            stopPlayback();
            clearMessages();
            clearStoreMessages();
            setDemoMode(false);
            hasBootstrappedRef.current = false;
        } else if (action.target === 'internal:restart-demo') {
            stopPlayback();
            hasBootstrappedRef.current = true;
            if (activeDemoId) runDemoPlayback(activeDemoId);
        } else if (action.target?.startsWith('chat:')) {
            const q = decodeURIComponent(action.target.slice('chat:'.length));
            append({ role: 'user', content: q });
        }
    }, [transitionTo, clearMessages, clearStoreMessages, setDemoMode, activeDemoId, runDemoPlayback, append, handleRestart, stopPlayback]);

    const handleFeedback = useCallback(async (index: number, score: number) => {
        const msg = messages[index];

        try {
            const prevMsg = messages[index - 1];
            const requestText = (prevMsg && prevMsg.role === 'user') ? prevMsg.content : "";

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score,
                    requestText, // Key for FeedbackStore lookup
                    contextNodeId: msg.data?.contextNodeId, // Stateless ID
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
    }, [messages, sessionId, showToast, tChat]);

    const handleSend = useCallback((text: string) => {
        if (text.trim()) {
            sendMessage(text);
        }
    }, [sendMessage]);

    if (uiState !== 'fullscreen') return null;

    return (
        <div
            ref={containerRef}
            className="flex flex-col bg-white border-l border-slate-200 transition-all duration-300 ease-out h-full"
            style={{ height: '100%' }}
        >
            {/* Header */}
            <ChatHeader
                isDemoMode={isDemoMode}
                onRestart={handleRestart}
                onMinimize={() => setIsMinimized(!isMinimized)}
                onClose={() => transitionTo('collapsed_desktop')}
            />

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
                        {messages.length === 0 && !isLoading && !isDemoMode && (
                            <EmptyState onSend={(text) => append({ role: 'user', content: text })} />
                        )}

                        {messages.map((msg: any, idx: number) => (
                            <MessageBubble
                                key={msg.id || idx}
                                msg={msg}
                                idx={idx}
                                handleAction={handleAction}
                                handleFeedback={handleFeedback}
                            />
                        ))}

                        {/* Optimistic UI: Show skeleton immediately when loading, before content arrives */}
                        {isLoading && (
                            messages.length === 0 ||
                            messages[messages.length - 1]?.role !== 'assistant' ||
                            !messages[messages.length - 1]?.content
                        ) && (
                                <SkeletonMessageBubble />
                            )}

                        {/* ThinkingBubble: Show thinking step if available */}
                        {thinkingStep && (
                            <div className="flex justify-start">
                                <ThinkingBubble content={thinkingStep} isThinking={true} />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <ChatInput
                        onSend={handleSend}
                        isLoading={isLoading}
                        isDemoPlaying={isDemoPlaying}
                    />
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
