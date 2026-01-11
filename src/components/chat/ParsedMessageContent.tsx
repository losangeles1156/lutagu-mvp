'use client';

import { useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain } from 'lucide-react';

// Component to parse Dify markers and render Markdown
export const ParsedMessageContent = memo(({ content, role }: { content: string; role: string }) => {
    const tL4 = useTranslations('l4');
    const parsed = useMemo(() => {
        if (!content) return { text: '', thinking: null, suggestedQuestions: [] };

        let text = content;

        // --- Response Content Filtering Mechanism ---
        // Filter out ** symbols (Markdown bold) as per Dify prompt requirements
        text = text.replace(/\*\*/g, '');

        let thinking: string | null = null;
        let suggestedQuestions: string[] = [];

        // Extract [THINKING] marker
        const thinkingMatch = text.match(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/);
        if (thinkingMatch) {
            thinking = thinkingMatch[1].trim();
            text = text.replace(thinkingMatch[0], '').trim();
        }

        // Extract [SUGGESTED_QUESTIONS] marker
        const sqMatch = text.match(/\[SUGGESTED_QUESTIONS\]([\s\S]*?)\[\/SUGGESTED_QUESTIONS\]/);
        if (sqMatch) {
            try {
                suggestedQuestions = JSON.parse(sqMatch[1]);
            } catch {
                suggestedQuestions = [];
            }
            text = text.replace(sqMatch[0], '').trim();
        }

        return { text, thinking, suggestedQuestions };
    }, [content]);

    return (
        <div className="space-y-2">
            {/* Thinking Indicator */}
            {parsed.thinking && (
                <div className="flex items-center gap-2 text-xs text-indigo-500 bg-indigo-50 px-3 py-2 rounded-lg mb-2">
                    <Brain size={14} className="animate-pulse" />
                    <span className="font-medium">{tL4('thinking.initializing')}</span>
                </div>
            )}

            {/* Main Content with Markdown */}
            {parsed.text && (
                <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsed.text}
                    </ReactMarkdown>
                </div>
            )}

            {/* Suggested Questions */}
            {parsed.suggestedQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100/50">
                    {parsed.suggestedQuestions.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                // Will be handled by parent - for now just show
                                console.log('Suggested question clicked:', q);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});
ParsedMessageContent.displayName = 'ParsedMessageContent';
