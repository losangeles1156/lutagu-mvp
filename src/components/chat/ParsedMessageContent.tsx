'use client';

import { useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
// ReactMarkdown and remarkGfm replaced by dynamic import wrapper
import dynamic from 'next/dynamic';
import { Brain } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';

const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer'), {
    loading: () => <span className="animate-pulse">...</span>,
    ssr: false // Client-side only optimization
});

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
            // Match ALL thinking blocks (global) to handle multiple or nested tags
            // Also handle unclosed tags at the end
            // Regex to find closed thinking blocks [THINKING]...[/THINKING] (Global, Case Insensitive, Multiline)
            const closedRegex = /\[THINKING\]([\s\S]*?)\[\/THINKING\]/gi;
            const matches = Array.from(text.matchAll(closedRegex));

            if (matches.length > 0) {
                // Combine all thinking content
                thinking = matches.map(m => m[1].trim()).join('\n---\n');
                // Remove all matched blocks from text
                text = text.replace(closedRegex, '').trim();
            }

            // Handle trailing open tag [THINKING]... (end of string)
            const openMatch = text.match(/\[THINKING\]([\s\S]*)$/i);
            if (openMatch) {
                const openContent = openMatch[1].trim();
                thinking = thinking ? `${thinking}\n---\n${openContent}` : openContent;
                text = text.replace(openMatch[0], '').trim();
            }
        } else {
            // If thinking is provided via prop, strictly strip all markers from text
            text = text.replace(/\[THINKING\]\s*([\s\S]*?)\s*(?:\[\/THINKING\]|$)/g, '').trim();
        }

        // Final thorough safety cleanup: remove any remaining partial or malformed tags
        text = text.replace(/\[\/?THINKING\]/gi, '');
        text = text.replace(/\[\/?SUGGESTED_QUESTIONS\]/gi, '');

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
            {parsed.text && (
                <div
                    data-testid="chat-message-text"
                    className={`prose prose-sm max-w-none ${role === 'user' ? 'prose-invert' : 'text-slate-800'}`}
                >
                    <MarkdownRenderer>
                        {parsed.text}
                    </MarkdownRenderer>
                </div>
            )}
        </div>
    );
});
ParsedMessageContent.displayName = 'ParsedMessageContent';
