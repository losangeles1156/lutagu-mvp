import { ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ThinkingBubbleProps {
    content: string;
    isThinking?: boolean;
}

export function ThinkingBubble({ content, isThinking = false }: ThinkingBubbleProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!content && !isThinking) return null;

    return (
        <div className="mb-2 max-w-[85%]">
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
                <span>
                    {isThinking ? "Lutagu is thinking..." : "Thought Process"}
                </span>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out pl-2 border-l-2 border-primary/20 ml-2 mt-1",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="py-2 text-xs text-muted-foreground font-mono bg-muted/30 rounded-r-md px-3 whitespace-pre-wrap leading-relaxed">
                    {content || (isThinking && <span className="animate-pulse">Analyzing request...</span>)}
                </div>
            </div>
        </div>
    );
}
