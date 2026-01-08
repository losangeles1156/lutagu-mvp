'use client';

import { useTypewriter } from '@/hooks/useTypewriter';
import { useEffect, useState, useCallback } from 'react';

interface TypewriterProps {
    text: string;
    /** 打字速度（毫秒/字符），預設 30ms */
    speed?: number;
    /** 是否啟用打字效果，預設 true */
    enabled?: boolean;
    /** 是否顯示游標，預設 true */
    cursor?: boolean;
    /** 游標閃爍速度（毫秒），預設 500ms */
    cursorBlinkSpeed?: number;
    /** 額外的 CSS 類名 */
    className?: string;
    /** 動畫完成後的 callback */
    onComplete?: () => void;
    /** 點擊跳過動畫，預設 true */
    skipOnClick?: boolean;
    /** 遇到句號等標點時的額外延遲（毫秒） */
    punctuationDelay?: number;
}

/**
 * 帶游標的打字機顯示組件
 * 支援點擊跳過、動畫完成回調、標點符號延遲
 */
export function Typewriter({
    text,
    speed = 30,
    enabled = true,
    cursor = true,
    cursorBlinkSpeed = 500,
    className = '',
    onComplete,
    skipOnClick = true,
    punctuationDelay = 150
}: TypewriterProps) {
    const { displayedText, isComplete, isTyping, skip } = useTypewriter(text, {
        speed,
        enabled,
        onComplete,
        punctuationDelay
    });

    const [showCursor, setShowCursor] = useState(true);

    // 游標閃爍效果
    useEffect(() => {
        if (!cursor) {
            setShowCursor(false);
            return;
        }

        // 動畫完成後停止閃爍並隱藏游標
        if (isComplete) {
            // 延遲一下再隱藏游標，讓用戶看到最後一刻
            const timeout = setTimeout(() => {
                setShowCursor(false);
            }, 800);
            return () => clearTimeout(timeout);
        }

        const interval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, cursorBlinkSpeed);

        return () => clearInterval(interval);
    }, [cursor, cursorBlinkSpeed, isComplete]);

    // 點擊跳過
    const handleClick = useCallback(() => {
        if (skipOnClick && isTyping && !isComplete) {
            skip();
        }
    }, [skipOnClick, isTyping, isComplete, skip]);

    return (
        <span
            className={`${className} ${skipOnClick && isTyping ? 'cursor-pointer' : ''}`}
            onClick={handleClick}
            role={skipOnClick && isTyping ? 'button' : undefined}
            aria-label={skipOnClick && isTyping ? '點擊跳過動畫' : undefined}
            tabIndex={skipOnClick && isTyping ? 0 : undefined}
            onKeyDown={(e) => {
                if (skipOnClick && isTyping && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    skip();
                }
            }}
        >
            {displayedText}
            {cursor && showCursor && !isComplete && (
                <span
                    className="inline-block w-[3px] h-[1.2em] bg-indigo-500 ml-0.5 align-middle rounded-sm animate-pulse"
                    aria-hidden="true"
                />
            )}
        </span>
    );
}
