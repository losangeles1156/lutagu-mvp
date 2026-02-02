'use client';

import { useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Brain } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';
import MarkdownRenderer from './MarkdownRenderer';

// Component to parse Agent markers and render Markdown
export const ParsedMessageContent = memo(({ content, role, thought }: { content: string; role: string; thought?: string | null }) => {
    const tL4 = useTranslations('l4');
    const parsed = useMemo(() => {
        if (!content) return { text: '', thinking: thought || null };

        let text = content;

        // --- Response Content Filtering Mechanism ---
        // Aggressively remove ** symbols (Markdown bold) as per Agent prompt requirements
        text = text.split('**').join('');

        let thinking: string | null = thought || null;

        // Extract [THINKING] marker if not already provided via prop
        if (!thinking) {
            // Match ALL thinking blocks (global) - support various formats with flexible spacing
            // Pattern handles: [THINKING], [ THINKING ], [THINKING ], etc.
            const closedRegex = /\[\s*THINKING\s*\]([\s\S]*?)\[\s*\/\s*THINKING\s*\]/gi;
            const matches = Array.from(text.matchAll(closedRegex));

            if (matches.length > 0) {
                // Combine all thinking content
                thinking = matches.map(m => m[1].trim()).join('\n---\n');
                // Remove all matched blocks from text
                text = text.replace(closedRegex, '').trim();
            }

            // Handle trailing open tag [THINKING]... (end of string) - with flexible spacing
            const openMatch = text.match(/\[\s*THINKING\s*\]([\s\S]*)$/i);
            if (openMatch) {
                const openContent = openMatch[1].trim();
                // Only add if content is meaningful and not another tag
                if (openContent && !openContent.startsWith('[')) {
                    thinking = thinking ? `${thinking}\n---\n${openContent}` : openContent;
                }
                text = text.replace(openMatch[0], '').trim();
            }
        } else {
            // If thinking is provided via prop, strictly strip all markers from text
            text = text.replace(/\[\s*THINKING\s*\]\s*([\s\S]*?)\s*(?:\[\s*\/\s*THINKING\s*\]|$)/gi, '').trim();
        }

        // Final thorough safety cleanup: remove any remaining partial or malformed tags
        // More aggressive pattern to catch all variants with flexible spacing
        text = text.replace(/\[\s*\/?\s*THINKING\s*\]/gi, '');
        text = text.replace(/\[\s*\/?\s*SUGGESTED_QUESTIONS\s*\]/gi, '');

        // Double check for ** marks and strip them again (just in case they were nested or added later)
        text = text.replace(/\*\*/g, '').trim();

        return { text, thinking };
    }, [content, thought]);

    return (
        <div className="space-y-2">
            {/* Thinking Indicator/Bubble */}
            {parsed.thinking && (
                <ThinkingBubble content={parsed.thinking} />
            )}

            {/* Main Content with Markdown */}
            <div
                data-testid="chat-message-text"
                className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert' : 'text-slate-800'}`}
            >
                {parsed.text ? (
                    <MarkdownRenderer>
                        {parsed.text}
                    </MarkdownRenderer>
                ) : (
                    role === 'assistant' && <span className="opacity-0">...</span>
                )}
            </div>
        </div>
    );
});
ParsedMessageContent.displayName = 'ParsedMessageContent';
