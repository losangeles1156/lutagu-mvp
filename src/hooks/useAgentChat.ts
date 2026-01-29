'use client';

import { PlanParser } from '@/lib/agent/planParser';
import { AgentPlan } from '@/lib/agent/types';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAppStore } from '@/stores/appStore';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { TextStreamChatTransport } from 'ai';

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    thought?: string | null;
    rawContent?: string;
    type?: string;
    data?: any;
    agentPlan?: AgentPlan | null;
}

export const useAgentChat = (options: {
    stationId?: string;
    userLocation?: { lat: number; lng: number };
    initialMessages?: AgentMessage[];
    onComplete?: (message: string) => void;
    syncToUIStateMachine?: boolean;
} = {}) => {
    const {
        stationId = '',
        userLocation,
        initialMessages = [],
        onComplete,
        syncToUIStateMachine = true
    } = options;
    const { locale } = useAppStore();
    const tL4 = useTranslations('l4');
    const { user } = useAuth();

    // Local state for thinking process visibility
    const [thinkingStep, setThinkingStep] = useState<string | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(() => {
        if (locale === 'zh-TW') return ['新宿車站有寄物櫃嗎？', '最新的運行狀態？', '附近的推薦景點？'];
        if (locale === 'ja') return ['新宿駅にコインロッカーはありますか？', '最新の運行状況は？', '周辺のおすすめスポットは？'];
        return ['Are there lockers in Shinjuku?', 'Current status?', 'Recommended spots nearby?'];
    });
    const [isOffline, setIsOffline] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useMemo(() => `session-${Date.now()}`, []);

    const agentEndpoint = '/api/agent/v2';

    // AI SDK implementation matching project's transport-based architecture
    const transport = useMemo(() => new TextStreamChatTransport({
        api: agentEndpoint,
        body: {
            locale,
            nodeId: stationId,
            userLocation,
        }
    }), [locale, stationId, userLocation]);

    const {
        messages: aiMessages,
        sendMessage: sendAiMessage,
        status,
        setMessages: setAiMessages,
    } = useChat({
        transport,
        onError: (error) => {
            console.error('[Agent 2.0] Chat Error:', error);
            setIsOffline(true);
        },
    });

    // Handle initial messages if provided
    useEffect(() => {
        if (initialMessages.length > 0 && aiMessages.length === 0) {
            setAiMessages((initialMessages as any[]).map(m => ({
                id: m.id,
                role: m.role,
                content: m.content || '',
                parts: m.parts || [{ type: 'text', text: m.content || '' }]
            })));
        }
    }, [initialMessages, setAiMessages, aiMessages.length]);

    const isLoading = status === 'streaming' || status === 'submitted';

    // Map aiMessages to AgentMessage format
    const messages: AgentMessage[] = useMemo(() => {
        return aiMessages.map((m: any) => {
            let content = m.content || (m.parts?.find((p: any) => p.type === 'text')?.text) || '';
            const rawContent = content;

            // Filter out ** symbols
            content = content.replace(/\*\*/g, '');

            // 1. Extract Thinking
            let thought: string | null = null;
            const closedThinkingMatch = content.match(/\[THINKING\]\s*([\s\S]*?)\s*\[\/THINKING\]/);
            const openThinkingMatch = content.match(/\[THINKING\]([\s\S]*)$/);

            if (closedThinkingMatch) {
                thought = closedThinkingMatch[1].trim();
                content = content.replace(closedThinkingMatch[0], '').trim();
            } else if (openThinkingMatch) {
                thought = openThinkingMatch[1].trim();
                content = content.replace(openThinkingMatch[0], '').trim();
            }

            // 2. Extract Plan (Agent 2.0)
            const plans = PlanParser.parseComplete(content);
            const latestPlan = plans.length > 0 ? plans[plans.length - 1] : null;
            content = PlanParser.stripTags(content);

            // 3. Extract Hybrid Data
            const hybridDataMatch = content.match(/\[HYBRID_DATA\]([\s\S]*?)\[\/HYBRID_DATA\]/);
            let hybridData: any = null;
            if (hybridDataMatch) {
                try {
                    hybridData = JSON.parse(hybridDataMatch[1]);
                    content = content.replace(hybridDataMatch[0], '').trim();
                } catch (e) {
                    console.error('Failed to parse Hybrid Data:', e);
                }
            }

            // 5. Final fallback cleanup
            content = content.replace(/\[\/?THINKING\]/gi, '').trim();

            return {
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content,
                thought,
                rawContent,
                type: hybridData?.type,
                data: hybridData ? (hybridData.data || hybridData) : (m.data || null),
                agentPlan: latestPlan,
            };
        });
    }, [aiMessages]);

    // Side effects for thinkingStep
    useEffect(() => {
        const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistantMessage?.thought) {
            setThinkingStep(lastAssistantMessage.thought);
        } else if (!isLoading) {
            setThinkingStep(null);
        }

        // Handle onComplete
        if (!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
            onComplete?.(messages[messages.length - 1].content);
        }
    }, [messages, isLoading, onComplete]);

    // Persist to UI State Machine (Legacy Sync Logic)
    const hasHydratedRef = useRef(false);
    useEffect(() => {
        if (!syncToUIStateMachine || hasHydratedRef.current) return;
        const storeMessages = useUIStateMachine.getState().messages;
        if (storeMessages.length > 0) {
            setAiMessages((storeMessages as any[]).map(m => ({
                id: m.id,
                role: m.role as any,
                content: m.content || '',
                parts: [{ type: 'text', text: m.content || '' }]
            })));
        }
        hasHydratedRef.current = true;
    }, [syncToUIStateMachine, setAiMessages]);

    useEffect(() => {
        if (!syncToUIStateMachine) return;
        const nextStoreMessages = messages.map((m, idx) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: (useUIStateMachine.getState().messages[idx] as any)?.timestamp || Date.now()
        }));
        useUIStateMachine.getState().setMessages(nextStoreMessages as any);
    }, [messages, syncToUIStateMachine]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        setIsOffline(false);
        try {
            await sendAiMessage({
                text
            }, {
                body: {
                    locale,
                    nodeId: stationId,
                    userLocation,
                }
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsOffline(true);
        }
    }, [sendAiMessage, locale]);

    const hookReturn = {
        messages,
        input,
        handleInputChange: (e: any) => setInput(e.target.value),
        handleSubmit: (e: any) => {
            e?.preventDefault();
            sendMessage(input);
            setInput('');
        },
        sendMessage,
        setMessages: setAiMessages,
        isLoading,
        thinkingStep,
        suggestedQuestions,
        isOffline,
        clearMessages: () => {
            setAiMessages([]);
            useUIStateMachine.getState().setMessages([]);
        },
        clearHistory: () => {
            setAiMessages([]);
            useUIStateMachine.getState().setMessages([]);
        },
        messagesEndRef,
        sessionId
    };

    // Log hook return to verify all properties are present for debugging
    if (typeof window !== 'undefined') {
        console.log('[useAgentChat] returning hook properties:', Object.keys(hookReturn));
    }

    return hookReturn;
};
