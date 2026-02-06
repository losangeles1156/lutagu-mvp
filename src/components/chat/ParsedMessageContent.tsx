'use client';

import { useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import { Brain } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';
import MarkdownRenderer from './MarkdownRenderer';

// Component to parse Agent markers and render Markdown
// Component to parse Agent markers and render Markdown
export const ParsedMessageContent = memo(({ content, role, thought, isStreaming }: { content: string; role: string; thought?: string | null; isStreaming?: boolean }) => {
    const tL4 = useTranslations('l4');
    const parsed = useMemo(() => {
        if (!content) return { text: '', thinking: thought || null };

        let text = content;

        // --- Response Content Filtering Mechanism ---
        // Aggressively remove ** symbols (Markdown bold) as per Agent prompt requirements
        text = text.split('**').join('');

        let thinking: string | null = thought || null;

        // Calculate active thinking content to potentially exclude
        // We use similar logic to useAgentChat to identify if the last block is "active"
        let activeThinkingContent: string | null = null;

        // Extract [THINKING] marker if not already provided via prop
        if (!thinking) {
            // Match ALL thinking blocks (global) to handle multiple or nested tags
            // [Fix] Robust Regex for <think>, [THINKING], [THINK] with flexible whitespace
            // Supports: [THINKING], [THINK], <think>, <thinking>
            const closedRegex = /(?:\[|<)THINK(?:ING)?(?:\]|>)([\s\S]*?)(?:\[\/|<\/)THINK(?:ING)?(?:\]|>)/gi;
            const matches = Array.from(text.matchAll(closedRegex));

            let thinkingBlocks: string[] = [];

            if (matches.length > 0) {
                thinkingBlocks = matches.map(m => m[1].trim());
                // Remove all matched blocks from text
                text = text.replace(closedRegex, '').trim();
            }

            // Handle trailing open tag [THINKING]... (end of string)
            const openMatch = text.match(/(?:\[|<)THINK(?:ING)?(?:\]|>)([\s\S]*)$/i);
            if (openMatch) {
                const openContent = openMatch[1].trim();
                thinkingBlocks.push(openContent);
                text = text.replace(openMatch[0], '').trim();
            }

            // If streaming, check if we should hide the last block (because it's shown as active bubble)
            if (isStreaming && thinkingBlocks.length > 0) {
                // If the last block was open (openMatch), it's definitely active.
                // If the last block was closed but we are streaming, AND there is no text content following it?
                // Wait, we already stripped text. 
                // We need to know if there was text *after* the last block in the original content?
                // But we just modified `text`. 

                // Simpler approach: If isStreaming, assume the last thinking block is the "active" one handled by ChatPanel
                // IF the ChatPanel logic also picked it up.
                // ChatPanel picks it up if it's at the end.
                // Since we stripped them from `text`, if `text` is empty/short, then the thinking block was at the end?
                // This acts as a heuristic.

                // Ideally we keep it consistent: pop the last one.
                // But if we have multiple history blocks? e.g. [T]1[/T] [T]2[/T].
                // If streaming, 2 is active. 1 is history.
                // So we render 1. Hide 2.

                // If only 1 block: [T]1[/T]. Streaming. Active. Hide 1. Render nothing (text empty).
                // User sees floating bubble "1". Correct.

                const lastBlock = thinkingBlocks[thinkingBlocks.length - 1];
                thinkingBlocks.pop();
            }

            if (thinkingBlocks.length > 0) {
                thinking = thinkingBlocks.join('\n---\n');
            } else {
                thinking = null;
            }

        } else {
            // If thinking is provided via prop (legacy/mock), strictly strip all markers from text
            text = text.replace(/(?:\[|<)THINK(?:ING)?(?:\]|>)\s*([\s\S]*?)\s*(?:(?:\[\/|<\/)THINK(?:ING)?(?:\]|>)|$)/gi, '').trim();
        }

        // Final thorough safety cleanup: remove any remaining partial or malformed tags
        text = text.replace(/(?:\[|\/?|<|\/?)THINK(?:ING)?(?:\]|\/?>)/gi, '');
        text = text.replace(/\[\/?SUGGESTED_QUESTIONS\]/gi, '');
        text = text.replace(/\[HYBRID_DATA\][\s\S]*?\[\/HYBRID_DATA\]/gi, '');
        text = text.replace(/\[ADK_JSON\][\s\S]*?\[\/ADK_JSON\]/gi, '');

        // Double check for ** marks and strip them again (just in case they were nested or added later)
        text = text.replace(/\*\*/g, '').trim();

        return { text, thinking };
    }, [content, thought, isStreaming]);

    return (
        <div className="space-y-2">
            {/* Thinking Indicator/Bubble (History) */}
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
