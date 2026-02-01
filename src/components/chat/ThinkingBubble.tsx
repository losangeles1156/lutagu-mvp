import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ThinkingBubbleProps {
    content: string;
    isThinking?: boolean;
}

// Animated typing dots component
function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
    );
}

export function ThinkingBubble({ content, isThinking = false }: ThinkingBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('l4.thinking');

    if (!content && !isThinking) return null;

    return (
        <div className="mb-2 max-w-[85%]" data-testid="thinking-bubble">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-6 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-transparent p-0 flex items-center gap-1 group transition-colors"
                aria-expanded={isOpen}
            >
                <div className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary transition-all",
                    isThinking && "animate-pulse"
                )}>
                    <BrainCircuit className="w-3 h-3" />
                </div>
                <span className="flex items-center gap-1.5">
                    {isThinking ? (
                        <>{t('header_active')} <TypingDots /></>
                    ) : (
                        t('header_history')
                    )}
                </span>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out pl-2 border-l-2 border-primary/20 ml-2 mt-1",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="py-2 text-xs text-muted-foreground font-mono bg-muted/30 rounded-r-md px-3 whitespace-pre-wrap leading-relaxed">
                    {content || (isThinking && <span className="animate-pulse">{t('analyzing')}</span>)}
                </div>
            </div>
        </div>
    );
}

