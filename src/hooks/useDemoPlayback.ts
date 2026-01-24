'use client';

import { useCallback, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { demoScripts, MultiRoundDemoScript } from '@/data/demoScripts';
import { useUIStore } from '@/stores/uiStore';
import { AgentMessage } from '@/hooks/useAgentChat';

interface UseDemoPlaybackOptions {
    setMessages: (updater: any) => void;
    onPlaybackComplete?: () => void;
}

export function useDemoPlayback({ setMessages, onPlaybackComplete }: UseDemoPlaybackOptions) {
    const locale = useLocale();
    const demoRunTokenRef = useRef(0);
    const [isDemoPlaying, setIsDemoPlaying] = useState(false);

    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

    const resolveLang = useCallback(() => {
        return (locale === 'ja' || locale === 'en' || locale === 'zh-TW') ? locale : 'zh';
    }, [locale]);

    const renderTemplate = (template: string, vars: Record<string, string>) => {
        return template
            .replace(/\{\{\s*time\s*\}\}/g, vars.time ?? '')
            .replace(/\{\{\s*weather\s*\}\}/g, vars.weather ?? '');
    };

    const updateAssistantMessage = useCallback((assistantMsgId: string, content: string, isLoading: boolean, data?: any) => {
        setMessages((prev: any[]) => {
            return prev.map((m: any) => {
                if (m.id !== assistantMsgId) return m;
                return { ...m, content, data: data || m.data, isLoading };
            });
        });
    }, [setMessages]);

    const startPlayback = useCallback(async (demoId: string) => {
        const script = demoScripts[demoId];
        if (!script) return;

        const lang = resolveLang();
        const token = ++demoRunTokenRef.current;

        setIsDemoPlaying(true);
        setMessages(() => []);
        useUIStore.setState({ messages: [] });

        const vars = {
            time: script.mockContext?.time?.[lang] ?? '',
            weather: script.mockContext?.weather?.[lang] ?? ''
        };

        const rounds = Array.isArray(script.rounds) ? script.rounds : [];

        for (const round of rounds) {
            if (demoRunTokenRef.current !== token) return;

            // 1. User Message
            const userText = round.userMessage?.[lang] ?? '';
            const userMsg: AgentMessage = {
                id: `demo-${demoId}-r${round.roundNumber}-user-${Date.now()}`,
                role: 'user',
                content: userText
            };

            setMessages((prev: any[]) => [...prev, userMsg]);
            await sleep(450);
            if (demoRunTokenRef.current !== token) return;

            // 2. Assistant Initializing (Thinking)
            const assistantMsgId = `demo-${demoId}-r${round.roundNumber}-assistant-${Date.now()}`;
            const assistantMsg: AgentMessage = {
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                data: { isLoading: true }
            };
            setMessages((prev: any[]) => [...prev, assistantMsg]);

            // 3. Typing Simulation
            const responseTemplate = round.assistantResponse?.[lang] ?? '';
            const responseText = renderTemplate(responseTemplate, vars);
            let displayedText = '';
            const chunkSize = 2;

            for (let i = 0; i < responseText.length; i += chunkSize) {
                if (demoRunTokenRef.current !== token) return;
                await sleep(30);
                displayedText += responseText.slice(i, i + chunkSize);
                updateAssistantMessage(assistantMsgId, displayedText, true);
            }

            // 4. Finalize Round with Actions
            const roundActions = Array.isArray(round.actions) ? round.actions : [];
            const localizedActions = roundActions.map((a: any) => ({
                ...a,
                label: a.label?.[lang] ?? a.label
            }));

            const isLastRound = round.roundNumber === 3;
            const endActions = isLastRound ? [
                {
                    type: 'discovery',
                    label: lang === 'ja' ? '始めましょう' : lang === 'en' ? 'Start Journey' : '開始規劃',
                    target: 'internal:end-demo'
                }
            ] : [];

            updateAssistantMessage(
                assistantMsgId,
                displayedText,
                false,
                { actions: [...localizedActions, ...endActions] }
            );

            await sleep(typeof round.pauseAfterMs === 'number' ? round.pauseAfterMs : 650);
        }

        if (demoRunTokenRef.current === token) {
            setIsDemoPlaying(false);
            onPlaybackComplete?.();
        }
    }, [resolveLang, setMessages, updateAssistantMessage, onPlaybackComplete]);

    const stopPlayback = useCallback(() => {
        demoRunTokenRef.current++;
        setIsDemoPlaying(false);
    }, []);

    return {
        startPlayback,
        stopPlayback,
        isDemoPlaying
    };
}
