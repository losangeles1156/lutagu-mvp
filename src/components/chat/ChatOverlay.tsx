'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useTranslations } from 'next-intl';

export function ChatOverlay() {
    // const t = useTranslations('Chat');
    const { isChatOpen, setChatOpen, messages, addMessage } = useAppStore();
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

    const handleAction = (action: any) => {
        if (action.type === 'navigate') {
            // Mock Coords for now
            const targets: Record<string, [number, number]> = {
                'ueno': [35.7141, 139.7774],
                'shibuya': [35.6580, 139.7016],
                'shinjuku': [35.6896, 139.7006]
            };
            const coords = targets[action.target] || [35.6895, 139.6917];

            useAppStore.getState().setMapCenter({ lat: coords[0], lon: coords[1] });
            useAppStore.getState().setChatOpen(false); // Close chat to see map
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white/80 backdrop-blur">
                <h2 className="font-bold text-lg">Bambi AI</h2>
                <button
                    onClick={() => setChatOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-20">
                        <p>問我關於東京的任何事...</p>
                    </div>
                )}

                {messages.map((msg: { role: string, content: string, actions?: any[] }, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                            {msg.content}

                            {/* Action Cards */}
                            {msg.actions && (
                                <div className="mt-2 space-y-2">
                                    {msg.actions.map((action: any, i: number) => (
                                        <button
                                            key={i}
                                            className="w-full text-left text-sm bg-white/90 text-indigo-700 px-3 py-2 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-50"
                                            onClick={() => handleAction(action)}
                                        >
                                            🚀 {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50 pb-8">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="輸入訊息..."
                        className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-indigo-700 transition"
                        disabled={!input.trim()}
                    >
                        ↑
                    </button>
                </form>
            </div>
        </div>
    );
}
