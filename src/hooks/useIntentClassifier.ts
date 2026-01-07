'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { L4IntentKind } from '@/lib/l4/assistantEngine';

export type IntentClassificationResult = {
    kind: L4IntentKind;
    confidence: number;
    suggestedStationId?: string;
    alternativeIntents?: Array<{ kind: L4IntentKind; score: number }>;
    needsMoreInfo?: boolean;
    missingInfoPrompt?: string;
};

export interface UseIntentClassifierOptions {
    stationId?: string;
    stationName?: string;
    onIntentRecognized?: (intent: IntentClassificationResult) => void;
    onError?: (error: Error) => void;
}

export interface UseIntentClassifierReturn {
    classifyIntent: (text: string) => Promise<IntentClassificationResult | null>;
    isClassifying: boolean;
    lastResult: IntentClassificationResult | null;
    clearResult: () => void;
    abortClassification: () => void;
}

export function useIntentClassifier(options: UseIntentClassifierOptions): UseIntentClassifierReturn {
    const { stationId, stationName, onIntentRecognized, onError } = options;
    const locale = useLocale();
    const t = useTranslations('l4');
    
    const [isClassifying, setIsClassifying] = useState(false);
    const [lastResult, setLastResult] = useState<IntentClassificationResult | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const abortClassification = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsClassifying(false);
    }, []);

    const classifyIntent = useCallback(async (text: string): Promise<IntentClassificationResult | null> => {
        if (!text.trim()) return null;
        
        // Abort any ongoing classification
        abortClassification();
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsClassifying(true);

        try {
            const response = await fetch('/api/dify/classify-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: text,
                    currentStationId: stationId || '',
                    currentStationName: stationName || '',
                    locale,
                    context: {
                        userPreferences: [],
                        recentQueries: []
                    }
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Classification failed: ${response.status}`);
            }

            const data = await response.json();
            
            const result: IntentClassificationResult = {
                kind: data.kind || 'unknown',
                confidence: data.confidence || 0,
                suggestedStationId: data.suggestedStationId,
                alternativeIntents: data.alternativeIntents,
                needsMoreInfo: data.needsMoreInfo,
                missingInfoPrompt: data.missingInfoPrompt
            };

            setLastResult(result);
            onIntentRecognized?.(result);
            return result;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return null;
            }
            console.error('Intent classification error:', error);
            onError?.(error instanceof Error ? error : new Error('Unknown classification error'));
            return null;
        } finally {
            setIsClassifying(false);
            abortControllerRef.current = null;
        }
    }, [locale, stationId, stationName, onIntentRecognized, onError, abortClassification]);

    const clearResult = useCallback(() => {
        setLastResult(null);
    }, []);

    return {
        classifyIntent,
        isClassifying,
        lastResult,
        clearResult,
        abortClassification
    };
}
