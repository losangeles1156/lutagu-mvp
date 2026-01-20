'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Loader2, Map as MapIcon, Ticket, Clock,
    HelpCircle, ChevronDown, RefreshCw, Zap, Target
} from 'lucide-react';
import { useIntentClassifier, type IntentClassificationResult } from '@/hooks/useIntentClassifier';
import type { L4IntentKind } from '@/lib/l4/assistantEngine';
import { logger } from '@/lib/utils/logger';

interface IntentSelectorProps {
    value: L4IntentKind | null;
    onChange: (intent: L4IntentKind | null) => void;
    onIntentClassification?: (result: IntentClassificationResult) => void;
    disabled?: boolean;
    className?: string;
}

interface IntentOption {
    id: L4IntentKind;
    icon: typeof MapIcon;
    labelKey: string;
    descriptionKey: string;
    quickPrompts?: string[];
}

export function IntentSelector({
    value,
    onChange,
    onIntentClassification,
    disabled = false,
    className = ''
}: IntentSelectorProps) {
    const locale = useLocale();
    const t = useTranslations('l4');
    const tCommon = useTranslations('common');

    const [inputText, setInputText] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [manualSelection, setManualSelection] = useState<L4IntentKind | null>(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        classifyIntent,
        isClassifying,
        lastResult,
        clearResult,
        abortClassification
    } = useIntentClassifier({
        onIntentRecognized: (result) => {
            onIntentClassification?.(result);
            if (result.kind !== 'unknown' && result.confidence > 0.7) {
                onChange(result.kind);
                setManualSelection(result.kind);
                setInputText('');
                setShowSuggestions(false);
            }
        },
        onError: (error) => {
            logger.error('Intent classification error', error);
        }
    });

    const options: IntentOption[] = [
        {
            id: 'route',
            icon: MapIcon,
            labelKey: t('intent.route'),
            descriptionKey: t('intent.routeDesc'),
            quickPrompts: [t('intent.routeQuick1'), t('intent.routeQuick2')]
        },
        {
            id: 'timetable',
            icon: Clock,
            labelKey: t('intent.timetable'),
            descriptionKey: t('intent.timetableDesc'),
            quickPrompts: [t('intent.timetableQuick1'), t('intent.timetableQuick2')]
        },
        {
            id: 'fare',
            icon: Ticket,
            labelKey: t('intent.fare'),
            descriptionKey: t('intent.fareDesc'),
            quickPrompts: [t('intent.fareQuick1'), t('intent.fareQuick2')]
        },
        {
            id: 'status',
            icon: Zap,
            labelKey: t('intent.status'),
            descriptionKey: t('intent.statusDesc'),
            quickPrompts: [t('intent.statusQuick1')]
        },
        {
            id: 'amenity',
            icon: Target,
            labelKey: t('intent.amenity'),
            descriptionKey: t('intent.amenityDesc'),
            quickPrompts: [t('intent.amenityQuick1'), t('intent.amenityQuick2')]
        }
    ];

    const handleManualSelect = useCallback((intent: L4IntentKind) => {
        if (disabled) return;
        setManualSelection(intent);
        onChange(intent);
        clearResult();
        setInputText('');
        setShowSuggestions(false);
    }, [disabled, onChange, clearResult]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isClassifying || disabled) return;

        await classifyIntent(inputText);
    }, [inputText, isClassifying, disabled, classifyIntent]);

    const handleQuickPrompt = useCallback((prompt: string) => {
        setInputText(prompt);
        inputRef.current?.focus();
    }, []);

    const handleClear = useCallback(() => {
        setInputText('');
        setManualSelection(null);
        onChange(null);
        clearResult();
        inputRef.current?.focus();
    }, [onChange, clearResult]);

    // Handle click/touch outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(o => o.id === (manualSelection || value));

    return (
        <div ref={containerRef} className={`space-y-3 ${className}`}>
            {/* Selected Intent Display */}
            <AnimatePresence mode="wait">
                {selectedOption ? (
                    <motion.div
                        key="selected"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                    <selectedOption.icon size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-slate-800">
                                        {selectedOption.id === 'fare' ? t('intent.fare') || '票價查詢' :
                                            selectedOption.id === 'timetable' ? t('intent.timetable') || '時刻表' :
                                                selectedOption.id === 'route' ? t('intent.route') || '路線規劃' :
                                                    selectedOption.id === 'status' ? t('intent.status') || '運行狀態' :
                                                        selectedOption.id === 'amenity' ? t('intent.amenity') || '車站設施' : selectedOption.id}
                                    </div>
                                    <div className="text-sm font-bold text-slate-500">
                                        {selectedOption.id === 'fare' ? t('intent.fareDesc') || '計算各路線乘車費用' :
                                            selectedOption.id === 'timetable' ? t('intent.timetableDesc') || '查詢車站即時發車時間' :
                                                selectedOption.id === 'route' ? t('intent.routeDesc') || '尋找最快或最舒適的路徑' :
                                                    selectedOption.id === 'status' ? t('intent.statusDesc') || '查看路線是否有延誤或中斷' :
                                                        selectedOption.id === 'amenity' ? t('intent.amenityDesc') || '尋找電梯、置物櫃或廁所' : ''}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleClear}
                                disabled={disabled}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 active:scale-95 transition-all touch-manipulation"
                                aria-label={tCommon('clear')}
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Quick Prompts */}
                        {selectedOption.quickPrompts && selectedOption.quickPrompts.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {selectedOption.quickPrompts.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickPrompt(prompt)}
                                        disabled={disabled}
                                        className="px-4 py-3 rounded-xl bg-white border border-indigo-100 text-xs font-bold text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-4"
                    >
                        <div className="text-sm font-bold text-slate-400">
                            {locale.startsWith('zh') ? '點擊下方選項或輸入問題' :
                                locale === 'ja' ? '下のオプションをクリックするか、質問を入力してください' :
                                    'Select an option below or type a question'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Natural Language Input */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                    <Sparkles
                        size={18}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isClassifying ? 'text-indigo-600 animate-pulse' : 'text-slate-400'
                            }`}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={t('intent.inputPlaceholder')}
                        disabled={disabled || isClassifying}
                        className="w-full pl-12 pr-24 py-4 bg-white border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={t('intent.inputPlaceholder')}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isClassifying || disabled}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95 transition-all touch-manipulation min-w-[70px]"
                    >
                        {isClassifying ? (
                            <Loader2 size={16} className="animate-spin mx-auto" />
                        ) : (
                            t('intent.analyze') || (locale.startsWith('zh') ? '分析' : locale === 'ja' ? '分析' : 'Analyze')
                        )}
                    </button>
                </div>

                {/* Classification Result / Loading State */}
                <AnimatePresence>
                    {isClassifying ? (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 overflow-hidden"
                        >
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-black text-indigo-700 uppercase tracking-wide">
                                        {locale.startsWith('zh') ? '分析中...' : locale === 'ja' ? '分析中...' : 'Analyzing...'}
                                    </div>
                                    <div className="text-sm font-bold text-indigo-600">
                                        {inputText.length > 25 ? inputText.substring(0, 25) + '...' : inputText}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : lastResult && lastResult.kind !== 'unknown' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 overflow-hidden"
                        >
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Sparkles size={16} className="text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                                        {locale.startsWith('zh') ? '已識別意圖' : locale === 'ja' ? '認識された意図' : 'Intent Recognized'}
                                    </div>
                                    <div className="text-sm font-bold text-emerald-800">
                                        {lastResult.kind === 'route' ? t('intent.route') :
                                            lastResult.kind === 'timetable' ? t('intent.timetable') :
                                                lastResult.kind === 'fare' ? t('intent.fare') :
                                                    lastResult.kind === 'status' ? t('intent.status') :
                                                        lastResult.kind === 'amenity' ? t('intent.amenity') : lastResult.kind}
                                        <span className="ml-2 text-xs font-bold text-emerald-600">
                                            ({Math.round(lastResult.confidence * 100)}%)
                                        </span>
                                    </div>
                                </div>
                                {lastResult.needsMoreInfo && (
                                    <button
                                        type="button"
                                        onClick={abortClassification}
                                        className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"
                                    >
                                        <HelpCircle size={16} className="text-amber-600" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Intent Options Grid - Mobile Optimized */}
                <AnimatePresence>
                    {showSuggestions && !selectedOption && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="p-2 grid grid-cols-2 gap-2">
                                {options.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleManualSelect(option.id)}
                                        disabled={disabled}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 active:scale-[0.98] transition-all touch-manipulation min-h-[80px] justify-center"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                            <option.icon size={20} strokeWidth={2} />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-black text-slate-700">
                                                {option.id === 'fare' ? t('intent.fare') || '票價查詢' :
                                                    option.id === 'timetable' ? t('intent.timetable') || '時刻表' :
                                                        option.id === 'route' ? t('intent.route') || '路線規劃' :
                                                            option.id === 'status' ? t('intent.status') || '運行狀態' :
                                                                option.id === 'amenity' ? t('intent.amenity') || '車站設施' : option.id}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {option.id === 'fare' ? t('intent.fareDesc') || '票價' :
                                                    option.id === 'timetable' ? t('intent.timetableDesc') || '時間' :
                                                        option.id === 'route' ? t('intent.routeDesc') || '路線' :
                                                            option.id === 'status' ? t('intent.statusDesc') || '狀態' :
                                                                option.id === 'amenity' ? t('intent.amenityDesc') || '設施' : ''}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Manual Selection Tabs - Fallback */}
            {!selectedOption && (
                <div className="flex p-1 bg-slate-100 rounded-2xl touch-manipulation">
                    {options.slice(0, 3).map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleManualSelect(option.id)}
                            disabled={disabled}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black transition-all active:scale-95 touch-manipulation min-h-[44px]"
                        >
                            <option.icon size={16} strokeWidth={2.5} />
                            <span className="truncate">
                                {option.id === 'fare' ? t('intent.fare') || '票價' :
                                    option.id === 'timetable' ? t('intent.timetable') || '時刻表' :
                                        option.id === 'route' ? t('intent.route') || '路線' : option.id}
                            </span>
                        </button>
                    ))}
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        disabled={disabled}
                        className="flex items-center justify-center gap-1 px-3 py-3 rounded-xl text-xs font-bold text-slate-500 active:scale-95 touch-manipulation min-h-[44px]"
                    >
                        <ChevronDown size={16} className={`transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
}
