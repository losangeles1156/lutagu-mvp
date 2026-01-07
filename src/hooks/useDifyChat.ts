'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';

export interface DifyMessage {
    role: 'user' | 'assistant';
    content: string;
    isStrategy?: boolean;
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

export function useDifyChat(options: UseDifyChatOptions) {
    const { stationId, stationName, onMessage, onComplete, onError } = options;
    
    const tL4 = useTranslations('l4');
    const locale = useLocale();
    const { zone } = useZoneAwareness();
    
    const [messages, setMessages] = useState<DifyMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [thinkingStep, setThinkingStep] = useState<string>('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string>(
        globalThis.crypto?.randomUUID?.() ||
        `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );
    
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
                label: '無障礙',
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
    
    // Send message to Dify API
    const sendMessage = useCallback(async (text: string, userProfile: string = 'general') => {
        if (!text.trim() || isLoading) return;
        
        const userMsg: DifyMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setIsOffline(false);
        setThinkingStep(tL4('thinking.initializing'));
        
        // Fake "Thinking Steps" to visualize the process
        const steps = [
            tL4('thinking.l2'),
            tL4('thinking.l3'),
            tL4('thinking.kb'),
            tL4('thinking.synthesizing')
        ];
        
        let stepIdx = 0;
        const stepInterval = setInterval(() => {
            if (stepIdx < steps.length) {
                setThinkingStep(steps[stepIdx]);
                stepIdx++;
            }
        }, 1500);
        
        try {
            const response = await fetch('/api/dify/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: text,
                    conversation_id: conversationIdRef.current,
                    inputs: {
                        user_profile: userProfile,
                        current_station: stationId || '',
                        station_name: stationName || '',
                        locale,
                        zone: zone || 'core',
                        user_id: userIdRef.current
                    }
                })
            });
            
            clearInterval(stepInterval);
            
            if (!response.ok) throw new Error('Network error');
            if (!response.body) throw new Error('No body');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';
            let sseBuffer = '';
            
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            setThinkingStep('');
            
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
                    
                    const payload = line.slice(5).trimStart();
                    if (!payload || payload === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(payload);
                        if (data.conversation_id && typeof data.conversation_id === 'string') {
                            conversationIdRef.current = data.conversation_id;
                        }
                        if (data.event === 'agent_message' || data.event === 'message') {
                            accumulatedResponse += (data.answer || '');
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                newMsgs[newMsgs.length - 1].content = accumulatedResponse;
                                onMessage?.(newMsgs[newMsgs.length - 1]);
                                return newMsgs;
                            });
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
            
            onComplete?.();
            
        } catch (error) {
            console.error('Dify Chat Error:', error);
            setIsOffline(true);
            setMessages(prev => [...prev, { role: 'assistant', content: tL4('chatError') }]);
            clearInterval(stepInterval);
            onError?.(error instanceof Error ? error : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
            setThinkingStep('');
        }
    }, [isLoading, locale, stationId, stationName, zone, tL4, onMessage, onComplete, onError]);
    
    const clearMessages = useCallback(() => {
        setMessages([]);
        conversationIdRef.current = null;
    }, []);
    
    return {
        messages,
        setMessages,
        isLoading,
        isOffline,
        thinkingStep,
        sendMessage,
        clearMessages,
        quickButtons,
        messagesEndRef,
        userId: userIdRef.current
    };
}
