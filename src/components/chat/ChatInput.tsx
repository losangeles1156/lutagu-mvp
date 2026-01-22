'use client';

import { memo, FormEvent, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { trackFunnelEvent } from '@/lib/tracking';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
    isDemoPlaying: boolean;
    maxLength?: number;
    placeholder?: string;
}

export const ChatInput = memo(({
    onSend,
    isLoading,
    isDemoPlaying,
    maxLength = 500,
    placeholder
}: ChatInputProps) => {
    const [input, setInput] = useState('');
    const tChat = useTranslations('chat');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isDemoPlaying) return;

        const trimmed = input.trim();
        if (trimmed) {
            onSend(trimmed);
            setInput('');
            trackFunnelEvent({
                step_name: 'query_input',
                step_number: 1,
                path: '/chat',
                metadata: { query_length: trimmed.length }
            });
        }
    };

    return (
        <div className="shrink-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder || tChat('placeholder')}
                    maxLength={maxLength}
                    disabled={isDemoPlaying}
                    className="flex-1 px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <button
                    type="submit"
                    disabled={isDemoPlaying || !input.trim() || isLoading}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
                    aria-label="Send Message"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
            </form>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';
