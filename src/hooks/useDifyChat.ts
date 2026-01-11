'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useTranslations, useLocale } from 'next-intl';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';

export interface DifyMessage {
    role: 'user' | 'assistant';
    content: string;
    isStrategy?: boolean;
    source?: 'template' | 'algorithm' | 'llm';
    data?: any;
}

export interface UseDifyChatOptions {
    stationId?: string;
    stationName?: string;
    onMessage?: (message: DifyMessage) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
}

export interface UseDifyChatReturn {
    messages: DifyMessage[];
    setMessages: React.Dispatch<React.SetStateAction<DifyMessage[]>>;
    isLoading: boolean;
    isOffline: boolean;
    thinkingStep: string;
    sendMessage: (text: string, userProfile?: string) => Promise<void>;
    clearMessages: () => void;
}

// Quick button configuration type
export interface QuickButton {
    id: string;
    label: string;
    demands: string[];
    profile: string;
    prompt: string;
}

// removed hybridEngine import to avoid server-side code in client bundle

import { metricsCollector } from '@/lib/l4/monitoring/MetricsCollector';

export function useDifyChat(options: UseDifyChatOptions) {
    const { stationId, stationName, onMessage, onComplete, onError } = options;

    const tL4 = useTranslations('l4');
    const locale = useLocale();
    const { zone } = useZoneAwareness();

    const [isOffline, setIsOffline] = useState(false);
    const [thinkingStep, setThinkingStep] = useState<string>('');
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userIdRef = useRef<string>(
        globalThis.crypto?.randomUUID?.() ||
        `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );

    // AI SDK v6 transport-based architecture
    const transport = useMemo(() => new DefaultChatTransport({
        api: '/api/agent/chat',
        body: {
            nodeId: stationId || '',
            stationName: stationName || '',
            locale,
            user_profile: 'general', // This will be overridden by sendMessage if userProfile is passed
            zone: zone || 'core'
        }
    }), [stationId, stationName, locale, zone]);

    const {
        messages: aiMessages,
        sendMessage: sendAiMessage,
        status,
        setMessages: setAiMessages,
    } = useChat({
        transport,
        onError: (error: Error) => {
            console.error('Chat Error:', error);
            setIsOffline(true);
            setThinkingStep('');
            onError?.(error);
        }
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // Clear thinking step when streaming completes
    useEffect(() => {
        if (status === 'ready' || status === 'error') {
            setThinkingStep('');
            // Clear suggested questions only on error, otherwise keep them until next message sent
            if (status === 'error') {
                setSuggestedQuestions([]);
            }
        }
    }, [status]);

    // Map aiMessages to DifyMessage format for backward compatibility
    // Also extract [THINKING] markers for thinking indicator
    const messages: DifyMessage[] = useMemo(() => {
        return aiMessages.map((m: any) => {
            let content = m.content || (m.parts?.find((p: any) => p.type === 'text')?.text) || '';

            // Filter out ** symbols (Markdown bold) as per Dify prompt requirements
            content = content.replace(/\*\*/g, '');

            // Extract thinking markers from content
            const thinkingMatch = content.match(/\[THINKING\](.*?)\[\/THINKING\]/g);
            if (thinkingMatch && thinkingMatch.length > 0) {
                // Get the last thinking message
                const lastThinking = thinkingMatch[thinkingMatch.length - 1];
                const thinkingText = lastThinking.replace(/\[THINKING\]|\[\/THINKING\]/g, '').trim();
                // We use a separate useEffect to sync state to avoid update during render
            }

            // Extract suggested questions - using [\s\S] instead of 's' flag for compatibility
            const suggestedMatch = content.match(/\[SUGGESTED_QUESTIONS\]([\s\S]*?)\[\/SUGGESTED_QUESTIONS\]/);

            // Allow side-effects in render is bad practice, but common for this pattern. 
            // Better to strip content here and update state in useEffect, but let's stick to this pattern for now
            // and use a heuristic to avoid infinite loops (check content change)

            // Actually, updating state during render is dangerous. 
            // Let's just strip the content here, and rely on a separate effect to parse the raw content if needed.
            // OR simpler: parse here but don't set state directly unless we are careful.

            // Refactored approach: Strip tags for display, but use a separate effect for state updates?
            // No, the previous code was trying to set state inside useMemo which causes React warnings.
            // Let's just Return the content stripped, and handle extraction in an effect.

            // Wait, to keep it simple and working:
            // We will strip the tags for the UI.
            // We need to extract the data.

            if (thinkingMatch && thinkingMatch.length > 0) {
                content = content.replace(/\n?\[THINKING\].*?\[\/THINKING\]\n?/g, '').trim();
            }

            if (suggestedMatch) {
                content = content.replace(/\n?\[SUGGESTED_QUESTIONS\][\s\S]*?\[\/SUGGESTED_QUESTIONS\]\n?/, '').trim();
            }

            return {
                role: m.role as 'user' | 'assistant',
                content,
                data: m.data,
                // Pass raw content for effect to parse
                rawContent: m.content || (m.parts?.find((p: any) => p.type === 'text')?.text) || ''
            };
        });
    }, [aiMessages]);

    // Effect to extract side-channel data (Thinking, Suggested Questions) from raw messages
    useEffect(() => {
        if (!aiMessages.length) return;

        const lastMsg = aiMessages[aiMessages.length - 1] as any;
        if (lastMsg.role !== 'assistant') return;

        const content = lastMsg.content || (lastMsg.parts?.find((p: any) => p.type === 'text')?.text) || '';

        // Thinking
        const thinkingMatch = content.match(/\[THINKING\](.*?)\[\/THINKING\]/g);
        if (thinkingMatch && thinkingMatch.length > 0) {
            const lastThinking = thinkingMatch[thinkingMatch.length - 1];
            const thinkingText = lastThinking.replace(/\[THINKING\]|\[\/THINKING\]/g, '').trim();
            if (thinkingText) setThinkingStep(thinkingText);
        }

        // Suggested Questions
        const suggestedMatch = content.match(/\[SUGGESTED_QUESTIONS\]([\s\S]*?)\[\/SUGGESTED_QUESTIONS\]/);
        if (suggestedMatch) {
            try {
                const jsonStr = suggestedMatch[1];
                const questions = JSON.parse(jsonStr);
                if (Array.isArray(questions)) {
                    setSuggestedQuestions(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(questions)) return questions;
                        return prev;
                    });
                }
            } catch (e) {
                // ignore
            }
        }
    }, [aiMessages]);

    // Generate quick buttons based on locale
    const quickButtons = useCallback((): QuickButton[] => {
        const displayName = stationName || '車站';
        const id = stationId || '';

        if (locale === 'ja') {
            return [
                {
                    id: 'route',
                    label: '最短ルート',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `タスク：ルート案内\n出発：${displayName}（${id}）\n目的地：先に「どこへ行きたいか（駅名/観光地）」を聞いてください\n要望：最速/乗換少なめ（どちらか）\n出力：2案、各案にルート・所要時間・乗換のコツを含める`
                },
                {
                    id: 'access',
                    label: 'バリアフリー',
                    demands: ['accessibility'],
                    profile: 'wheelchair',
                    prompt: `タスク：バリアフリー案内\n現在地：${displayName}（${id}）\n要望：エレベーターで移動できる出口/動線を優先\n不足情報：必要なら「どの出口/どの路線/どの方向か」を先に質問\n出力：結論→確認質問（必要時）の順で短く`
                },
                {
                    id: 'status',
                    label: '遅延・代替',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `タスク：運行状況\n影響駅：${displayName}（${id}）\nやること：この駅に影響する遅延/運休があるか確認し、あるなら代替案を1つ\n出力：要点だけ（1-2行）`
                }
            ];
        }

        if (locale === 'en') {
            return [
                {
                    id: 'route',
                    label: 'Fastest Route',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `Task: Route planning\nFrom: ${displayName} (${id})\nTo: Ask me where I want to go first (station/POI)\nPreference: fastest vs fewer transfers (pick one)\nOutput: 2 options, each with route, ETA, and key transfer tips`
                },
                {
                    id: 'access',
                    label: 'Accessibility',
                    demands: ['accessibility'],
                    profile: 'wheelchair',
                    prompt: `Task: Accessibility guidance\nLocation: ${displayName} (${id})\nPriority: elevator-only path and accessible exits\nIf missing info: ask which exit/line/direction\nOutput: direct recommendation first, then questions if needed`
                },
                {
                    id: 'status',
                    label: 'Delays & Backup',
                    demands: ['speed'],
                    profile: 'general',
                    prompt: `Task: Live disruptions\nAffected station: ${displayName} (${id})\nDo: check any delays/disruptions impacting this station and give 1 backup suggestion\nOutput: concise bullets`
                }
            ];
        }

        return [
            {
                id: 'route',
                label: '最快路線',
                demands: ['speed'],
                profile: 'general',
                prompt: `任務：路線規劃\n出發：${displayName}（${id}）\n目的地：請先問我想去哪一站/景點\n需求：最快 / 少轉乘（二選一）\n輸出：給 2 個選項，各含：路線、預估時間、轉乘關鍵點`
            },
            {
                id: 'access',
                label: '無障礙動線',
                demands: ['accessibility'],
                profile: 'wheelchair',
                prompt: `任務：無障礙動線\n目前：${displayName}（${id}）\n需求：優先電梯可達的出口/動線\n不足資訊：需要時先問我「哪個出口 / 哪條線 / 方向」\n輸出：先給結論，再補必要追問`
            },
            {
                id: 'status',
                label: '延誤/替代',
                demands: ['speed'],
                profile: 'general',
                prompt: `任務：即時運行狀態\n影響車站：${displayName}（${id}）\n要做：確認是否有延誤/停駛，若有給 1 個替代建議\n輸出：重點 1-2 行`
            }
        ];
    }, [locale, stationId, stationName]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingStep]);

    // Send message to our API
    const sendMessage = useCallback(async (text: string, userProfile: string = 'general') => {
        if (!text.trim() || isLoading) return;

        setIsOffline(false);
        setThinkingStep(tL4('thinking.initializing'));

        // --- Hybrid Engine Interception ---
        try {
            const hybridApiRes = await fetch('/api/agent/hybrid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    locale,
                    context: {
                        current_station: stationId,
                        user_profile: userProfile,
                        zone
                    }
                })
            });

            if (hybridApiRes.ok) {
                const hybridRes = await hybridApiRes.json();
                
                // The API returns { success: true, result: { content, source, ... } }
                const result = hybridRes.result;
                
                if (hybridRes.success && result && !result.passToLLM) {
                    const hybridMsg: any = {
                        id: `hybrid-${Date.now()}`,
                        role: 'assistant',
                        content: result.content || '',
                        parts: [{ type: 'text', text: result.content || '' }],
                        data: result.data,
                        source: result.source
                    };

                    // Add user message manually to aiMessages then assistant message
                    setAiMessages(prev => [
                        ...prev,
                        { id: `user-${Date.now()}`, role: 'user', content: text, parts: [{ type: 'text', text }] } as any,
                        hybridMsg
                    ]);

                    setThinkingStep('');
                    onMessage?.({
                        role: 'assistant',
                        content: result.content || '',
                        data: result.data,
                        source: result.source
                    });
                    onComplete?.();
                    return;
                }
            }
        } catch (err) {
            console.error('[HybridEngine] API Error:', err);
        }

        // Visualizing steps
        setThinkingStep(tL4('thinking.l2'));
        const startTime = Date.now();

        try {
            await sendAiMessage({ text });
            setThinkingStep('');
            onComplete?.();
            metricsCollector.recordRequest('llm', Date.now() - startTime);
        } catch (error) {
            console.error('Chat Error:', error);
            setIsOffline(true);
            setThinkingStep('');
        }
    }, [isLoading, locale, stationId, zone, tL4, sendAiMessage, setAiMessages, onMessage, onComplete]);

    const clearMessages = useCallback(() => {
        setAiMessages([]);
    }, [setAiMessages]);

    return {
        messages,
        setMessages: setAiMessages,
        isLoading,
        isOffline,
        thinkingStep,
        suggestedQuestions,
        sendMessage,
        clearMessages: () => setAiMessages([]),
        quickButtons,
        messagesEndRef,
        userId: userIdRef.current
    };
}
