'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useChat } from '@ai-sdk/react';

import { useAppStore } from '@/stores/appStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useLocale, useTranslations } from 'next-intl';
import {
    Minus,
    RotateCcw,
    Send,
    X,
    ThumbsUp,
    ThumbsDown,
    Loader2
} from 'lucide-react';
import { Action as ChatAction } from './ActionCard';
import { EmptyState } from './EmptyState';
import { useToast } from '@/components/ui/Toast';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { demoScripts } from '@/data/demoScripts';

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 400;
const MAX_INPUT_LENGTH = 500;

export function ChatPanel() {
    const locale = useLocale();
    const tChat = useTranslations('chat');
    const tCommon = useTranslations('common');

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

        setDifyConversationId,
        difyConversationId,
        difyUserId
    } = useAppStore(state => ({
        isDemoMode: state.isDemoMode,
        activeDemoId: state.activeDemoId,
        setDemoMode: state.setDemoMode,
        currentNodeId: state.currentNodeId,
        setCurrentNode: state.setCurrentNode,
        difyUserId: state.difyUserId,
        difyConversationId: state.difyConversationId,
        setDifyConversationId: state.setDifyConversationId,
        storeMessages: state.messages,
        addMessage: state.addMessage,
        clearMessages: state.clearMessages,
        setPendingChat: state.setPendingChat,
        pendingChatInput: state.pendingChatInput,
        pendingChatAutoSend: state.pendingChatAutoSend,
    }));

    // Toast
    const showToast = useToast();

    // Manage input state manually 
    const [input, setInput] = useState('');
    const [aiMessages, setAiMessages] = useState<any[]>([]);

    // Manual Chat Implementation with HybridEngine Fast Path
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (payload: { role: string; content: string } | string, options?: any) => {
        const text = typeof payload === 'string' ? payload : payload.content;
        if (!text.trim()) return;

        setIsLoading(true);
        const userMsg = { id: Date.now().toString(), role: 'user', content: text };

        // Optimistic Update
        setAiMessages(prev => [...prev, userMsg]);

        try {
            // === STEP 1: Try HybridEngine Fast Path (Level 1/2) ===
            const hybridResponse = await fetch('/api/agent/hybrid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    locale,
                    context: {
                        currentStation: currentNodeId || '',
                        userId: difyUserId
                    }
                })
            });

            if (hybridResponse.ok) {
                const hybridResult = await hybridResponse.json();

                // If HybridEngine handled it (Level 1 or Level 2)
                if (hybridResult && !hybridResult.passToLLM && hybridResult.content) {
                    console.log('[ChatPanel] HybridEngine fast path:', hybridResult.source);
                    const aiMsgId = (Date.now() + 1).toString();
                    setAiMessages(prev => [...prev, {
                        id: aiMsgId,
                        role: 'assistant',
                        content: hybridResult.content,
                        source: hybridResult.source // template, algorithm, poi_tagged, knowledge
                    }]);
                    setIsLoading(false);
                    return; // Fast path complete!
                }
            }

            // === STEP 2: Fall through to Dify Agent (Level 3) ===
            console.log('[ChatPanel] Falling through to Dify Agent');
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [userMsg],
                    nodeId: currentNodeId || '',
                    locale,
                    user_profile: 'general',
                    conversationId: difyConversationId,
                    userId: difyUserId
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server Error: ${response.status} ${errText}`);
            }

            if (!response.body) throw new Error('No response body');

            // Initialize AI Message for streaming
            const aiMsgId = (Date.now() + 1).toString();
            setAiMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                setAiMessages(prev => prev.map(m =>
                    m.id === aiMsgId ? { ...m, content: accumulatedContent } : m
                ));
            }

        } catch (error: any) {
            console.error('Chat Error:', error);
            const msg = error.message || 'Connection Failed';
            showToast?.(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Alias for compatibility
    const append = async (msg: { role: string; content: string }) => sendMessage(msg);

    // Display Messages Logic: Demo Mode vs AI Mode
    // We treat storeMessages as the source of truth for Demo Mode (legacy)
    // and aiMessages as the source for the new Real AI mode.
    const displayMessages = isDemoMode ? storeMessages : aiMessages;

    // Panel UI State
    const [isMinimized, setIsMinimized] = useState(false);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
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
                const chunkSize = 2; // Char per tick

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
                    }
                    return { messages: newMessages };
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
        if (aiMessages.length === 0 && !isDemoMode) {
            hasBootstrappedRef.current = true;
        }
    }, [uiState, isDemoMode, pendingChatInput, pendingChatAutoSend, append, setPendingChat, aiMessages.length, activeDemoId, locale, addStoreMessage, tChat, setDemoMode]);

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
        setAiMessages([]);
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

                        {/* Loading Indicator for Streaming */}
                        {isLoading && displayMessages[displayMessages.length - 1]?.role !== 'assistant' && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-lg shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <form onSubmit={(e) => { console.log('Form Submit:', input); e.preventDefault(); if (input.trim()) { sendMessage({ role: 'user', content: input } as any); setInput(''); } }} className="flex gap-2">
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

// Updated MessageBubble to handle Vercel AI SDK Tool Invocations
const MessageBubble = memo(({
    msg,
    idx,
    handleAction,
    handleFeedback
}: {
    msg: any;
    idx: number;
    handleAction: (action: any) => void;
    handleFeedback: (index: number, score: number) => void;
}) => {
    // Check for Tool Invocations
    const toolInvocations = msg.toolInvocations;

    // Legacy actions support (for Demo Mode)
    const legacyActions = msg.actions;

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
                max-w-[85%] p-4 rounded-2xl shadow-sm
                ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg'
                    : 'bg-white text-slate-800 rounded-bl-lg border border-slate-100'
                }
            `}>
                {/* Thinking Process (Brain) */}


                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                </div>

                {/* Render Legacy Actions (Demo Mode) */}
                {legacyActions && legacyActions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {legacyActions.map((action: any, i: number) => (
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

                {/* Render Tools - Phase 4 Logic */}
                {toolInvocations && toolInvocations.map((toolInvocation: any) => {
                    const { toolName, toolCallId, state, result } = toolInvocation;

                    if (state === 'result') {
                        // Render Result Card
                        if (toolName === 'calculate_tpi') {
                            return (
                                <div key={toolCallId} className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 mb-1">TRANSFER PAIN INDEX</div>
                                    <div className="text-lg font-black text-indigo-600">{result.score || 'N/A'} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
                                    <div className="text-sm font-bold text-slate-700">{result.recommendation}</div>
                                </div>
                            );
                        }
                        if (toolName === 'evaluate_delay_risk') {
                            return (
                                <div key={toolCallId} className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="text-xs font-bold text-amber-600 mb-1">DELAY RISK (CDR)</div>
                                    <div className="text-sm font-bold text-slate-800">{result.recommendation || 'Low Risk'}</div>
                                </div>
                            );
                        }
                        if (toolName === 'find_waiting_spots') {
                            return (
                                <div key={toolCallId} className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="text-xs font-bold text-emerald-600 mb-1">WAITING SPOTS</div>
                                    <div className="text-sm font-bold text-slate-800">{result.reasoning || 'Recommendation available'}</div>
                                    {result.suggestedAction && (
                                        <button onClick={() => handleAction({ type: 'navigate', target: 'chat:' + result.suggestedAction.location })} className="mt-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                            Go to {result.suggestedAction.location}
                                        </button>
                                    )}
                                </div>
                            );
                        }
                        if (toolName === 'check_safety') {
                            const levelColors = {
                                green: 'bg-emerald-50 border-emerald-200 text-emerald-600',
                                yellow: 'bg-amber-50 border-amber-200 text-amber-600',
                                orange: 'bg-orange-50 border-orange-200 text-orange-600',
                                red: 'bg-rose-50 border-rose-200 text-rose-600'
                            };
                            const theme = levelColors[result.triggerLevel as keyof typeof levelColors] || levelColors.green;
                            const isEmergency = result.triggerLevel === 'red' || result.triggerLevel === 'orange';

                            return (
                                <div key={toolCallId} className={`mt-2 p-3 rounded-lg border ${theme}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-xs font-bold uppercase">L5 SAFETY CHECK</div>
                                        {isEmergency && <div className="animate-pulse w-2 h-2 rounded-full bg-current" />}
                                    </div>

                                    {/* Headline Message */}
                                    <div className="text-sm font-bold mb-2">
                                        {result.localizedMessage?.zh || result.localizedMessage?.en || 'Safety Checked'}
                                    </div>

                                    {/* Active Alerts */}
                                    {result.activeAlerts?.length > 0 && (
                                        <div className="mb-2 space-y-1">
                                            {result.activeAlerts.map((alert: any, i: number) => (
                                                <div key={i} className="text-xs bg-white/50 px-2 py-1 rounded flex justify-between">
                                                    <span>{alert.headline}</span>
                                                    <span className="font-mono">{alert.level}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {result.warnings?.length > 0 && (
                                        <div className="text-xs font-medium opacity-90 mb-2">
                                            ⚠️ {result.warnings.join(', ')}
                                        </div>
                                    )}

                                    {/* Recommended Route */}
                                    {result.recommendedRoutes?.[0] && (
                                        <div className="mt-2 border-t border-current/20 pt-2">
                                            <div className="text-xs font-bold opacity-75 mb-1">RECOMMENDED EVACUATION ROUTE</div>
                                            <div className="text-sm font-bold flex items-center gap-1">
                                                <span>🏃‍♂️</span>
                                                <span>To: {result.recommendedRoutes[0].toShelter?.name?.ja || 'Safe Zone'}</span>
                                            </div>
                                            <div className="text-xs mt-1 opacity-75">
                                                {Math.round(result.recommendedRoutes[0].distanceMeters)}m · {result.recommendedRoutes[0].estimatedMinutes} min
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    } else {
                        // Loading State for Tool
                        return (
                            <div key={toolCallId} className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Using {toolName}...</span>
                            </div>
                        );
                    }
                })}

                {/* Feedback Buttons (Only for AI messages) */}
                {msg.role === 'assistant' && !msg.toolInvocations && !msg.isLoading && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100/50">
                        <button onClick={() => handleFeedback(idx, 1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-300 hover:text-emerald-500"><ThumbsUp size={14} /></button>
                        <button onClick={() => handleFeedback(idx, -1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-300 hover:text-rose-500"><ThumbsDown size={14} /></button>
                    </div>
                )}
            </div>
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble';

export default ChatPanel;
