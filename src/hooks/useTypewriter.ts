'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
    /** 打字速度（毫秒/字符），預設 30ms */
    speed?: number;
    /** 是否啟用打字效果，預設 true */
    enabled?: boolean;
    /** 動畫完成後的 callback */
    onComplete?: () => void;
    /** 遇到句號/問號/驚嘆號時的額外延遲（毫秒） */
    punctuationDelay?: number;
}

interface UseTypewriterResult {
    /** 已顯示的文本內容 */
    displayedText: string;
    /** 動畫是否已完成 */
    isComplete: boolean;
    /** 是否正在打字中 */
    isTyping: boolean;
    /** 跳過動畫，立即顯示全部文字 */
    skip: () => void;
}

// 需要額外延遲的標點符號
const PAUSE_PUNCTUATION = new Set(['。', '！', '？', '.', '!', '?', '：', ':']);
const MINOR_PAUSE_PUNCTUATION = new Set(['，', ',', '、', '；', ';']);

/**
 * 進階打字機效果 Hook
 * 支援動畫完成回調、跳過功能、標點符號延遲
 */
export function useTypewriter(
    text: string,
    options: UseTypewriterOptions = {}
): UseTypewriterResult {
    const {
        speed = 30,
        enabled = true,
        onComplete,
        punctuationDelay = 150
    } = options;

    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const textRef = useRef(text);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const indexRef = useRef(0);
    const onCompleteRef = useRef(onComplete);
    const skippedRef = useRef(false);

    // 更新 onComplete ref（避免 stale closure）
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // 當文本改變時，重置狀態
    useEffect(() => {
        if (text !== textRef.current) {
            textRef.current = text;
            indexRef.current = 0;
            skippedRef.current = false;
            setDisplayedText('');
            setIsComplete(false);
            setIsTyping(false);
        }
    }, [text]);

    // 跳過動畫
    const skip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        skippedRef.current = true;
        setDisplayedText(text);
        indexRef.current = text.length;
        setIsComplete(true);
        setIsTyping(false);
        onCompleteRef.current?.();
    }, [text]);

    // 打字效果
    useEffect(() => {
        if (!enabled || !text) {
            setIsComplete(true);
            return;
        }

        // 如果已經被跳過或已完成
        if (skippedRef.current || indexRef.current >= text.length) {
            if (!isComplete && indexRef.current >= text.length) {
                setIsComplete(true);
                onCompleteRef.current?.();
            }
            return;
        }

        setIsTyping(true);

        const typeNextChar = () => {
            const currentIndex = indexRef.current;

            if (currentIndex < text.length) {
                const currentChar = text[currentIndex];

                // 計算延遲時間
                let delay = speed;

                // 隨機化打字速度，使其更自然（±20% 變化）
                const variation = speed * 0.2;
                delay = speed + (Math.random() * variation * 2 - variation);

                // 標點符號額外延遲
                if (PAUSE_PUNCTUATION.has(currentChar)) {
                    delay += punctuationDelay;
                } else if (MINOR_PAUSE_PUNCTUATION.has(currentChar)) {
                    delay += punctuationDelay * 0.5;
                }

                timeoutRef.current = setTimeout(() => {
                    if (skippedRef.current) return;

                    indexRef.current = currentIndex + 1;
                    setDisplayedText(text.slice(0, currentIndex + 1));

                    if (currentIndex + 1 >= text.length) {
                        setIsComplete(true);
                        setIsTyping(false);
                        onCompleteRef.current?.();
                    } else {
                        typeNextChar();
                    }
                }, delay);
            }
        };

        // 只有在尚未開始時才啟動
        if (indexRef.current === 0 && displayedText === '') {
            typeNextChar();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [text, speed, enabled, punctuationDelay, displayedText, isComplete]);

    // 清理
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        displayedText,
        isComplete,
        isTyping,
        skip
    };
}

// === 向下兼容的簡易版本 ===

/**
 * 簡易打字機 Hook（向下兼容舊版 API）
 * @deprecated 請使用新版 useTypewriter 並傳入 options 物件
 */
export function useSimpleTypewriter(
    text: string,
    speed: number = 30,
    enabled: boolean = true
): string {
    const result = useTypewriter(text, { speed, enabled });
    return result.displayedText;
}

/**
 * 快速打字機（適用於較長文本，速度更快）
 */
export function useQuickTypewriter(
    text: string,
    enabled: boolean = true
): string {
    const result = useTypewriter(text, { speed: 15, enabled });
    return result.displayedText;
}

/**
 * 慢速打字機（適用於強調效果）
 */
export function useSlowTypewriter(
    text: string,
    enabled: boolean = true
): string {
    const result = useTypewriter(text, { speed: 50, enabled });
    return result.displayedText;
}
