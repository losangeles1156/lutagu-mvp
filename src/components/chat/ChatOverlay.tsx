'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useTranslations } from 'next-intl';

import { ActionCard, Action as ChatAction } from './ActionCard';

export function ChatOverlay() {
    // const t = useTranslations('Chat');
    const { isChatOpen, setChatOpen, messages, addMessage, setCurrentNode, setBottomSheetOpen } = useAppStore();
    const { zone, userLocation } = useZoneAwareness();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!isChatOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // User Message
        addMessage({ role: 'user', content: input });
        setInput('');

        // API Call
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: input }],
                    zone: zone || 'core',
                    userLocation
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            addMessage({
                role: 'assistant',
                content: data.answer,
                actions: data.actions
            });

        } catch (error) {
            addMessage({ role: 'assistant', content: '⚠️ 連線錯誤，請稍後再試。' });
        }
    };

    const handleAction = (action: ChatAction) => {
        if (action.type === 'navigate') {
            const targets: Record<string, [number, number]> = {
                'ueno': [35.7141, 139.7774],
                'shibuya': [35.6580, 139.7016],
                'shinjuku': [35.6896, 139.7006]
            };
            const coords = action.metadata?.coordinates || targets[action.target] || [35.6895, 139.6917];
            useAppStore.getState().setMapCenter({ lat: coords[0], lon: coords[1] });
            useAppStore.getState().setChatOpen(false);
        } else if (action.type === 'details') {
            if (action.target) {
                setCurrentNode(action.target);
                setBottomSheetOpen(true);
                setChatOpen(false);
            }
        } else if (action.type === 'trip') {
            addMessage({ role: 'assistant', content: `✅ 已將 ${action.label} 加入行程！` });
        } else if (action.type === 'taxi') {
            window.open(`https://go.mo-t.com/`, '_blank');
        } else if (action.type === 'discovery') {
            window.open(`https://luup.sc/`, '_blank');
        } else if (action.type === 'transit') {
            addMessage({ role: 'assistant', content: `正在為您開啟 ${action.label} 的詳細時刻表...` });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-500 bg-white/95 backdrop-blur-3xl sm:bg-white/80">
            {/* Header */}
            <div className="p-5 border-b border-gray-100/50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-200 text-white">
                        🦌
                    </div>
                    <div>
                        <h2 className="font-black text-lg tracking-tight text-gray-900 leading-none mb-1">Bambi AI</h2>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Online</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setChatOpen(false)}
                    className="w-10 h-10 rounded-full bg-gray-100/50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all active:scale-90 backdrop-blur-sm"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-8 animate-in fade-in zoom-in duration-700">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 rounded-full animate-pulse" />
                            <div className="w-24 h-24 bg-gradient-to-br from-white to-indigo-50 rounded-[32px] flex items-center justify-center text-5xl shadow-xl shadow-indigo-100 border border-white relative z-10">
                                ✨
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">想去哪裡逛逛？</h3>
                            <p className="text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                                小鹿 Bambi 已準備好為您導航。<br />嘗試詢問轉乘、美食或置物櫃資訊。
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                            {['帶我去上野公園', '附近的置物櫃', '銀座線現在擠嗎？'].map((tip, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(tip)}
                                    className="px-5 py-3.5 bg-white/60 hover:bg-white border border-white/50 hover:border-indigo-100 rounded-2xl text-sm font-bold text-gray-700 hover:text-indigo-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex justify-between items-center group backdrop-blur-sm"
                                >
                                    {tip}
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 group-hover:translate-x-1 duration-300">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg: { role: string, content: string, actions?: any[] }, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                        <div className={`max-w-[85%] p-4 sm:p-5 rounded-2xl shadow-sm ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-[4px]'
                            : 'bg-white/80 backdrop-blur-sm text-gray-800 rounded-bl-[4px] border border-white/40 shadow-sm'
                            }`}>
                            <div className="whitespace-pre-wrap leading-relaxed tracking-wide text-sm font-medium">
                                {msg.content}
                            </div>

                            {/* Action Cards */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {msg.actions.map((action: ChatAction, i: number) => (
                                        <ActionCard
                                            key={i}
                                            action={action}
                                            onClick={handleAction}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100/50 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto relative group">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="輸入訊息..."
                        className="flex-1 px-6 py-4 rounded-full border border-gray-200/80 bg-gray-50/50 hover:bg-white focus:bg-white focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium placeholder:text-gray-400 text-gray-900 shadow-inner"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-0 disabled:scale-75 shadow-lg shadow-indigo-200"
                    >
                        <span className="-mt-0.5">↑</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
