'use client';

import { PlanParser } from '@/lib/agent/planParser';
import { AgentPlan } from '@/lib/agent/types';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, TextStreamChatTransport } from 'ai';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { AGENT_CONFIG } from '@/lib/agent/config';

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

const agentEndpoint = AGENT_CONFIG.currentEndpoint;

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
    const normalizedLocale = locale === 'zh' ? 'zh-TW' : locale;
    const { user } = useAuth();

    const [thinkingStep, setThinkingStep] = useState<string | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    useEffect(() => {
        if (normalizedLocale === 'zh-TW' || normalizedLocale.startsWith('zh')) {
            setSuggestedQuestions(['新宿車站有寄物櫃嗎？', '最新的運行狀態？', '附近的推薦景點？']);
        } else if (normalizedLocale === 'ja' || normalizedLocale.startsWith('ja')) {
            setSuggestedQuestions(['新宿駅にコインロッカーはありますか？', '最新の運行状況は？', '周辺のおすすめスポットは？']);
        } else {
            setSuggestedQuestions(['Are there lockers in Shinjuku?', 'Current status?', 'Recommended spots nearby?']);
        }
    }, [normalizedLocale]);

    const [isOffline, setIsOffline] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionId = useMemo(() => `session-${Date.now()}`, []);

    const bodyRef = useRef({ locale: normalizedLocale, nodeId: stationId, userLocation });
    useEffect(() => {
        bodyRef.current = { locale: normalizedLocale, nodeId: stationId, userLocation };
    }, [normalizedLocale, stationId, userLocation]);

    const transport = useMemo(() => new TextStreamChatTransport({
        api: agentEndpoint,
        body: { locale: normalizedLocale, nodeId: stationId, userLocation }
    }), [normalizedLocale, stationId, userLocation]);

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
    const appendMessage = (chatHelpers as any).append as ((message: { role: string; content: string }, options?: any) => Promise<void>) | undefined;
    const sendText = (chatHelpers as any).sendMessage as ((payload: { text: string }, options?: any) => Promise<void>) | undefined;

    // Derived loading state
    const aiLoading = status === 'streaming' || status === 'submitted';
    const isLoading = aiLoading;

    // Direct mapping to preserve reactivity
    const extractText = (value: unknown): string => {
        if (typeof value === 'string') return value;
        if (!Array.isArray(value)) return '';
        return value.map((part) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            if (typeof part?.content === 'string') return part.content;
            return '';
        }).join('');
    };

    const extractHybridData = (content: string): { cleaned: string; type?: string; data?: any } => {
        if (!content) return { cleaned: '' };
        const match = content.match(/\[HYBRID_DATA\]([\s\S]*?)\[\/HYBRID_DATA\]/i);
        if (!match) return { cleaned: content };
        const jsonRaw = match[1];
        let parsed: any = null;
        try {
            parsed = JSON.parse(jsonRaw);
        } catch (error) {
            parsed = null;
        }
        const cleaned = content.replace(match[0], '').trim();
        return { cleaned, type: parsed?.type, data: parsed?.data };
    };

    const messages: AgentMessage[] = aiMessages.map((m: any) => {
        const contentText = typeof m?.content === 'string' ? m.content : '';
        const contentFromContentParts = extractText(m?.content);
        const contentFromParts = extractText(m?.parts);
        const resolvedContent = contentText || contentFromContentParts || contentFromParts || '';
        const hybridParsed = extractHybridData(resolvedContent);

        return {
            ...m,
            content: hybridParsed.cleaned || resolvedContent,
            rawContent: resolvedContent,
            type: hybridParsed.type || m.type,
            data: hybridParsed.data || m.data
        };
    }).filter((m: AgentMessage) => m.role !== 'system');

    const lastAssistantMessageStr = useMemo(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'assistant') return lastMsg.content;
        return null;
    }, [messages]);

    useEffect(() => {
        if (!lastAssistantMessageStr) {
            if (!isLoading) setThinkingStep(null);
            return;
        }

        // Find ALL thinking blocks to get the latest one
        // Use matchAll with global flag to capture all occurrences
        const matches = Array.from(lastAssistantMessageStr.matchAll(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/gi));

        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const lastContent = lastMatch[1].trim();

            // Check if this thinking block is effectively at the end of the message (ignoring whitespace)
            const fullMatchString = lastMatch[0];
            const matchIndex = lastMatch.index || 0;
            const indexAfterMatch = matchIndex + fullMatchString.length;
            const contentAfter = lastAssistantMessageStr.slice(indexAfterMatch).trim();

            // If content follows, we are not "thinking" anymore (we are speaking)
            if (!contentAfter) {
                setThinkingStep(lastContent);
            } else {
                setThinkingStep(null);
            }
        } else if (!isLoading) {
            setThinkingStep(null);
        }
    }, [lastAssistantMessageStr, isLoading]);

    // Issue 4: Frontend Timeout Protection
    useEffect(() => {
        if (!isLoading) return;
        const timeout = setTimeout(() => {
            console.warn('[useAgentChat] Response timeout - clearing thinkingStep');
            setThinkingStep(null);
        }, 60000); // 60s timeout
        return () => clearTimeout(timeout);
    }, [isLoading]);

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
        setThinkingStep(normalizedLocale === 'en' ? 'Thinking...' : '思考中...');
        try {
            console.log('[useAgentChat] Calling append/sendMessage...');

            if (appendMessage) {
                await appendMessage({
                    role: 'user',
                    content: text
                }, {
                    body: { ...bodyRef.current }
                });
            } else if (sendText) {
                await sendText({ text });
            } else {
                throw new Error('No append or sendMessage function found in useChat return values');
            }
            console.log('[useAgentChat] append completed');
        } catch (error) {
            console.error('[useAgentChat] Send error:', error);
            setIsOffline(true);
        }
    }, [appendMessage, sendText, isLoading, normalizedLocale]);

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
