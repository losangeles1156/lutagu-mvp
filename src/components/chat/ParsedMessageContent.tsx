'use client';

import { useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';

// Component to parse Dify markers and render Markdown
export const ParsedMessageContent = memo(({ content, role, thought }: { content: string; role: string; thought?: string | null }) => {
    const tL4 = useTranslations('l4');
    const parsed = useMemo(() => {
        if (!content) return { text: '', thinking: thought || null };

        let text = content;

        // --- Response Content Filtering Mechanism ---
        // Filter out ** symbols (Markdown bold) as per Dify prompt requirements
        text = text.replace(/\*\*/g, '');

        let thinking: string | null = thought || null;

        // Extract [THINKING] marker if not already provided via prop
        if (!thinking) {
            const thinkingMatch = text.match(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/);
            if (thinkingMatch) {
                thinking = thinkingMatch[1].trim();
                text = text.replace(thinkingMatch[0], '').trim();
            }
        } else {
            // If thinking is provided via prop, still strip the marker if it exists in text
            text = text.replace(/\[THINKING\]([\s\S]*?)(?:\[\/THINKING\]|$)/, '').trim();
        }

        // Extract [SUGGESTED_QUESTIONS] marker and strip it
        const sqMatch = text.match(/\[SUGGESTED_QUESTIONS\]([\s\S]*?)\[\/SUGGESTED_QUESTIONS\]/);
        if (sqMatch) {
            text = text.replace(sqMatch[0], '').trim();
        }

        return { text, thinking };
    }, [content, thought]);

    return (
        <div className="space-y-2">
            {/* Thinking Indicator/Bubble */}
            {parsed.thinking && (
                <ThinkingBubble content={parsed.thinking} />
            )}

            {/* Main Content with Markdown */}
            {parsed.text && (
                <div className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {parsed.text}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
});
ParsedMessageContent.displayName = 'ParsedMessageContent';
