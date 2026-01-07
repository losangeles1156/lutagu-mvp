'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
    Send,
    ChevronUp,
    ChevronDown,
    Sparkles,
    Bot,
    Minimize2,
    RotateCcw,
    WifiOff
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isLoading?: boolean;
}

// Sample welcome hints based on locale
const getWelcomeHints = (locale: string) => {
    if (locale === 'ja') {
        return [
            '浅草から渋谷までどう行くのが速いですか？',
            '銀座線で遅延情報はありますか？',
            '上野駅の出口にエレベーターはありますか？'
        ];
    }
    if (locale === 'en') {
        return [
            'Fastest way from Asakusa to Shibuya?',
            'Is the Ginza Line delayed right now?',
            'Which exits at Ueno have elevators?'
        ];
    }
    return [
        '從淺草到渋谷怎麼走最快？',
        '現在銀座線有延誤嗎？',
        '上野站哪個出口有電梯？'
    ];
};

export function LoginChatPanel() {
    const locale = useLocale();
    const t = useTranslations('chat');
    const tCommon = useTranslations('common');

    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: locale === 'ja'
                ? 'こんにちは！LUTAGU AI です。🥌\n\n交通_OPTIONS 可以幫您：\n• 即時列車運行情報\n• 無障礙路徑規劃\n• 替代路線搜尋\n\n您現在在哪裡？またはどこへ行きたいですか？'
                : locale === 'en'
                ? 'Hi! I\'m LUTAGU AI. 🥌\n\nI can help you with:\n• Live train status\n• Accessibility routes\n• Alternative paths\n\nWhere are you now, or where do you want to go?'
                : '嗨！我是 LUTAGU AI。🥌\n\n我可以幫您：\n• 即時列車運行狀態\n• 無障礙路徑規劃\n• 替代路線搜尋\n\n您現在在哪裡？或想去哪裡？'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const welcomeHints = getWelcomeHints(locale);

    // Detect mobile on client side
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Simulate AI response (replace with actual API call)
    const simulateResponse = useCallback((userMessage: string) => {
        setIsError(false);
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // Simulate AI thinking delay
        const timeoutId = setTimeout(() => {
            const responses: Record<string, string> = {
                'ja': `ご質問ありがとうございます！\n\n「${userMessage}」について調べてみます。\n\n具体的な駅名を教えていただければ、より正確な情報をお伝えできます。`,
                'en': `Thanks for your question!\n\nLet me look into "${userMessage}" for you.\n\nIf you can share a specific station name, I can provide more accurate information.`,
                'zh': `感謝您的提問！\n\n關於「${userMessage}」，讓我為您查詢一下。\n\n如果您能提供具體的站點名稱，我可以提供更準確的資訊。`
            };
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: responses[locale] || responses.zh
            }]);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [locale]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const text = input;
        setInput('');
        simulateResponse(text);
    };

    const handleHintClick = (hint: string) => {
        simulateResponse(hint);
    };

    const handleRestart = useCallback(() => {
        setMessages([{
            role: 'assistant',
            content: locale === 'ja'
                ? 'こんにちは！LUTAGU AI です。🥌\n\n交通_OPTIONS 可以幫您：\n• 即時列車運行情報\n• 無障礙路徑規劃\n• 替代路線搜尋\n\n您現在在哪裡？またはどこへ行きたいですか？'
                : locale === 'en'
                ? 'Hi! I\'m LUTAGU AI. 🥌\n\nI can help you with:\n• Live train status\n• Accessibility routes\n• Alternative paths\n\nWhere are you now, or where do you want to go?'
                : '嗨！我是 LUTAGU AI。🥌\n\n我可以幫您：\n• 即時列車運行狀態\n• 無障礙路徑規劃\n• 替代路線搜尋\n\n您現在在哪裡？或想去哪裡？'
        }]);
        setIsError(false);
    }, [locale]);

    // Height based on screen size - reduced to avoid overlap with login card
    const getHeightClass = () => {
        if (isMobile) return 'h-[35vh] max-h-[280px]';
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) return 'h-[28vh] max-h-[240px]';
        return 'h-[32vh] max-h-[260px]';
    };

    return (
        <div className={`
            fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]
            transition-all duration-300 ease-out flex flex-col
            ${isExpanded ? getHeightClass() : 'h-auto'}
            z-40
            pt-3
            pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        `}>
            {/* Toggle Handle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? tCommon('minimize', { defaultValue: 'Collapse chat panel' }) : tCommon('expand', { defaultValue: 'Expand chat panel' })}
                className="mx-auto -mb-2 px-6 py-3 bg-white border border-slate-200 border-b-0 rounded-t-2xl shadow-sm flex flex-col items-center gap-1.5 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:bg-indigo-50/50 min-h-[52px]"
            >
                <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-500" />
                    AI Assistant
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </span>
            </button>

            {isExpanded && (
                <>
                    {/* Header */}
                    <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md">
                                <Bot size={20} />
                            </div>
                            <div>
                                <div className="font-black text-sm text-slate-900">LUTAGU AI</div>
                                <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {t('activeBadge', { defaultValue: 'Online' })}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleRestart}
                                aria-label={t('restart', { defaultValue: 'Restart conversation' })}
                                className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all min-w-[40px] min-h-[40px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                onClick={() => setIsExpanded(false)}
                                aria-label={tCommon('minimize', { defaultValue: 'Minimize' })}
                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all min-w-[40px] min-h-[40px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {isError && (
                        <div className="shrink-0 px-4 py-2 bg-rose-50/80 border-b border-rose-100 flex items-center gap-2">
                            <WifiOff size={14} className="text-rose-500" />
                            <span className="text-xs font-bold text-rose-600">
                                {t('connectionError', { defaultValue: 'Connection error. Please try again.' })}
                            </span>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div 
                        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin"
                        role="log"
                        aria-live="polite"
                        aria-label={t('chatHistory', { defaultValue: 'Chat history' })}
                    >
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                role="presentation"
                            >
                                <div className={`
                                    max-w-[85%] p-4 rounded-2xl shadow-sm
                                    ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg'
                                        : 'bg-white text-slate-800 rounded-bl-lg border border-slate-200'
                                    }
                                `}>
                                    {msg.isLoading ? (
                                        <div className="flex space-x-2 items-center h-6" aria-label={t('loading', { defaultValue: 'Loading...' })}>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Welcome Hints (show when no user messages) */}
                        {messages.length === 1 && !isLoading && (
                            <div className="space-y-2 pt-2" role="group" aria-label={t('suggestedQuestions', { defaultValue: 'Suggested questions' })}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                    {t('tryAsking', { defaultValue: 'Try asking...' })}
                                </div>
                                {welcomeHints.map((hint, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleHintClick(hint)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleHintClick(hint);
                                            }
                                        }}
                                        aria-label={hint}
                                        className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        {hint}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('placeholder', { defaultValue: 'Ask me anything...' })}
                                aria-label={t('inputLabel', { defaultValue: 'Type your question' })}
                                aria-describedby={input ? undefined : 'input-hint'}
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl 
                                    text-sm font-bold placeholder:text-slate-400
                                    min-h-[48px] outline-none transition-all
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                                autoComplete="off"
                                autoFocus={!isMobile}
                            />
                            <span id="input-hint" className="sr-only">
                                {t('inputHint', { defaultValue: 'Enter your question and press send' })}
                            </span>
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                aria-label={t('sendButton', { defaultValue: 'Send message' })}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-xl
                                    hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all active:scale-95 min-w-[48px] min-h-[48px]
                                    flex items-center justify-center shadow-lg shadow-indigo-200"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}

export default LoginChatPanel;
