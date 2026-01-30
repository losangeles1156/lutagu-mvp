'use client';

import { PlanParser } from '@/lib/agent/planParser';
import { AgentPlan } from '@/lib/agent/types';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, TextStreamChatTransport } from 'ai';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations, useLocale } from 'next-intl';

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

const agentEndpoint = '/api/agent/adk';

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
    const locale = useLocale();
    const { user } = useAuth();

    const [thinkingStep, setThinkingStep] = useState<string | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    useEffect(() => {
        if (locale === 'zh-TW') {
            setSuggestedQuestions(['新宿車站有寄物櫃嗎？', '最新的運行狀態？', '附近的推薦景點？']);
        } else if (locale === 'ja' || locale.startsWith('ja')) {
            setSuggestedQuestions(['新宿駅にコインロッカーはありますか？', '最新の運行状況は？', '周辺のおすすめスポットは？']);
        } else {
            setSuggestedQuestions(['Are there lockers in Shinjuku?', 'Current status?', 'Recommended spots nearby?']);
        }
    }, [locale]);

    const [isOffline, setIsOffline] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useMemo(() => `session-${Date.now()}`, []);

    const bodyRef = useRef({ locale, nodeId: stationId, userLocation });
    useEffect(() => {
        bodyRef.current = { locale, nodeId: stationId, userLocation };
    }, [locale, stationId, userLocation]);

    const transport = useMemo(() => new TextStreamChatTransport({
        api: agentEndpoint,
        body: { locale, nodeId: stationId, userLocation }
    }), [locale, stationId, userLocation]);

    const chatHelpers = useChat({
        transport,
        onFinish: (result) => {
            console.log('[useAgentChat] Finished:', result);
            const content = (result.message as any)?.content || '';
            if (onComplete) onComplete(content);
            setThinkingStep(null);
        },
        onError: (err) => {
            console.error('[useAgentChat] Error:', err);
            setIsOffline(true);
            setThinkingStep(null);
        }
    });

    // Destructure specifically what we know exists or provide defaults
    const aiMessages = useMemo(() => chatHelpers.messages || [], [chatHelpers.messages]);
    const setMessages = chatHelpers.setMessages;
    const status = chatHelpers.status;
    const appendFn = (chatHelpers as any).append || (chatHelpers as any).sendMessage;

    // Derived loading state
    const aiLoading = status === 'streaming' || status === 'submitted';
    const isLoading = aiLoading;

    // Direct mapping to preserve reactivity
    const messages: AgentMessage[] = useMemo(() => {
        return aiMessages.map((m: any) => ({
            ...m,
            content: m.content || '',
            rawContent: m.content || ''
        }));
    }, [aiMessages]);

    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'assistant') {
            const match = lastMsg.content.match(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/i);
            if (match) setThinkingStep(match[1].trim());
            else if (!isLoading) setThinkingStep(null);
        }
    }, [messages, isLoading]);

    // UI State Sync
    useEffect(() => {
        if (!syncToUIStateMachine) return;
        useUIStateMachine.getState().setMessages(messages as any);
    }, [messages, syncToUIStateMachine]);

    // Debug log for aiMessages changes
    useEffect(() => {
        console.log('[useAgentChat] aiMessages updated:', aiMessages.length);
    }, [aiMessages]);

    const sendMessage = useCallback(async (text: string) => {
        console.log('[useAgentChat] sendMessage called with:', text);
        if (!text.trim() || isLoading) {
            console.log('[useAgentChat] sendMessage skipped (empty or loading)');
            return;
        }
        setIsOffline(false);
        try {
            console.log('[useAgentChat] Calling append/sendMessage...');

            if (!appendFn) {
                throw new Error('No append function found in useChat return values');
            }

            await appendFn({
                role: 'user',
                content: text
            }, {
                body: { ...bodyRef.current }
            });
            console.log('[useAgentChat] append completed');
        } catch (error) {
            console.error('[useAgentChat] Send error:', error);
            setIsOffline(true);
        }
    }, [appendFn, isLoading]);

    return {
        messages,
        input,
        handleInputChange: (e: any) => setInput(e.target.value),
        handleSubmit: (e?: any) => {
            e?.preventDefault();
            sendMessage(input);
            setInput('');
        },
        sendMessage,
        setMessages,
        isLoading,
        thinkingStep,
        suggestedQuestions,
        isOffline,
        clearMessages: () => {
            setMessages([]);
            useUIStateMachine.getState().setMessages([]);
        },
        clearHistory: () => {
            setMessages([]);
            useUIStateMachine.getState().setMessages([]);
        },
        messagesEndRef,
        sessionId
    };
};
