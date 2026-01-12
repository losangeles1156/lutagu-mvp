'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StationUIProfile } from '@/lib/types/stationStandard';
import { Send, Bot, Loader2, Maximize2, Minimize2, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useAgentChat } from '@/hooks/useAgentChat';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { MessageBubble } from '../chat/MessageBubble';

import { useZoneAwareness } from '@/hooks/useZoneAwareness';

interface L4_ChatProps {
    data: StationUIProfile;
    variant?: 'bambi' | 'strategy';
    seedQuestion?: string;
    seedUserProfile?: string;
    onSeedConsumed?: () => void;
}

export function L4_Chat({ data, variant = 'strategy', seedQuestion, seedUserProfile, onSeedConsumed }: L4_ChatProps) {
    const tL4 = useTranslations('l4');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const { id: stationId, name } = data || {};
    const dragControls = useDragControls();

    const setChatOpen = useAppStore(s => s.setChatOpen);
    const chatDisplayMode = useAppStore(s => s.chatDisplayMode);
    const setChatDisplayMode = useAppStore(s => s.setChatDisplayMode);

    const displayName = (name?.zh && name?.zh !== tL4('station') && name?.zh !== 'Station')
        ? name.zh
        : (name?.en || name?.ja || (stationId?.split(':').pop()?.split('.').pop()) || tCommon('station'));

    const [input, setInput] = useState('');
    const [hasGreeted, setHasGreeted] = useState(false);

    const { userLocation } = useZoneAwareness();

    const {
        messages,
        setMessages,
        isLoading,
        thinkingStep,
        suggestedQuestions,
        sendMessage,
        clearMessages,
        messagesEndRef
    } = useAgentChat({
        stationId: data.id,
        stationName: displayName,
        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
        onComplete: () => {
            // Optional callback
        }
    });

    useEffect(() => {
        if (displayName && !hasGreeted) {
            setMessages([{ id: 'initial', role: 'assistant', content: tL4('initialMessage', { station: displayName }) } as any]);
            setHasGreeted(true);
        }
    }, [displayName, hasGreeted, tL4, setMessages]);

    const handleReset = useCallback(() => {
        if (window.confirm(tL4('resetConfirm'))) {
            setMessages([{ id: 'initial', role: 'assistant', content: tL4('initialMessage', { station: displayName }) } as any]);
            setInput('');
        }
    }, [displayName, tL4, setMessages]);

    const handleSend = useCallback(async (textOverride?: string) => {
        const text = textOverride || input.trim();
        if (!text || isLoading) return;

        if (!textOverride) setInput('');
        await sendMessage(text, seedUserProfile || 'general'); // Assuming userProfileStr was meant to be seedUserProfile or a default
    }, [input, isLoading, sendMessage, seedUserProfile]);

    const handleQuickAction = (actionId: string, prompt: string) => {
        // ... implementation for quick actions ...
        handleSend(prompt);
    };

    return (
        <motion.div
            drag={chatDisplayMode !== 'full'}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className={`flex flex-col bg-white shadow-2xl transition-all duration-300 overflow-hidden ${chatDisplayMode === 'full' ? 'fixed inset-0 z-50' :
                chatDisplayMode === 'split' ? 'h-full w-full relative' :
                    'fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[380px] h-full sm:h-[500px] sm:rounded-2xl z-50'
                }`}
        >
            {/* Header Area */}
            <div
                onPointerDown={(e) => dragControls.start(e)}
                className="h-12 bg-slate-900 flex items-center justify-between px-4 shrink-0 cursor-move select-none"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-white/90 tracking-tight truncate max-w-[120px]">
                        {displayName} · LUTAGU
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleReset}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title={tCommon('retry')}
                    >
                        <RotateCcw size={16} />
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                        onClick={() => setChatDisplayMode('mini')}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <Minimize2 size={16} />
                    </button>
                    <button
                        onClick={() => setChatDisplayMode(chatDisplayMode === 'full' ? 'split' : 'full')}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <Maximize2 size={16} />
                    </button>
                    <button
                        onClick={() => setChatOpen(false)}
                        className="p-2 text-white/60 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 scrollbar-hide">
                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                        <MessageBubble
                            key={idx}
                            msg={msg}
                            idx={idx}
                            handleAction={(action) => handleSend(action.target)}
                            variant="l4"
                        />
                    ))}
                </AnimatePresence>

                {thinkingStep && (
                    <div className="flex justify-start">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                            <Loader2 size={14} className="text-slate-400 animate-spin" />
                            <span className="text-[11px] font-bold text-slate-400">{thinkingStep}</span>
                        </div>
                    </div>
                )}

                {suggestedQuestions.length > 0 && !thinkingStep && (
                    <div className="flex flex-col gap-2 mt-2 px-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Suggested</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    disabled={isLoading}
                                    className="text-left bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        placeholder={tL4('inputPlaceholder')}
                        value={input}
                        disabled={isLoading}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.nativeEvent as any)?.isComposing) return;
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="flex-1 h-11 px-4 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="h-11 w-11 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
