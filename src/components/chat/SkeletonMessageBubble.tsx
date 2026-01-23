'use client';

import { cn } from '@/lib/utils';

interface SkeletonMessageBubbleProps {
    className?: string;
}

/**
 * Skeleton bubble shown immediately when user sends a message.
 * Provides instant visual feedback (Optimistic UI pattern).
 */
export function SkeletonMessageBubble({ className }: SkeletonMessageBubbleProps) {
    return (
        <div className={cn("flex justify-start", className)}>
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-md">
                <div className="flex items-center gap-2">
                    {/* Animated skeleton bars */}
                    <div className="space-y-2">
                        <div className="h-3 w-48 bg-slate-300/60 rounded animate-pulse" />
                        <div className="h-3 w-36 bg-slate-300/60 rounded animate-pulse [animation-delay:150ms]" />
                        <div className="h-3 w-24 bg-slate-300/60 rounded animate-pulse [animation-delay:300ms]" />
                    </div>
                    {/* Typing dots on the side */}
                    <div className="flex items-center gap-1 ml-2">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
