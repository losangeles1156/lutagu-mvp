'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Star, Bug, MapPin, Lightbulb, Send, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface FeedbackHubProps {
    nodeId?: string;
    nodeName?: string;
}

type FeedbackType = 'general' | 'bug' | 'spot' | 'tip';

const FEEDBACK_OPTIONS: {
    type: FeedbackType;
    icon: typeof Star;
    color: string;
    bgColor: string;
}[] = [
        { type: 'general', icon: Star, color: 'text-amber-600', bgColor: 'bg-amber-100' },
        { type: 'bug', icon: Bug, color: 'text-red-600', bgColor: 'bg-red-100' },
        { type: 'spot', icon: MapPin, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
        { type: 'tip', icon: Lightbulb, color: 'text-blue-600', bgColor: 'bg-blue-100' }
    ];

export function FeedbackHub({ nodeId, nodeName }: FeedbackHubProps) {
    const t = useTranslations('feedback');
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
    const [content, setContent] = useState('');
    const [rating, setRating] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!selectedType || !content.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedbackType: selectedType,
                    content: content.trim(),
                    rating: selectedType === 'general' ? rating : undefined,
                    nodeId,
                    category: nodeName || undefined
                })
            });

            if (response.ok) {
                setSubmitted(true);
                setTimeout(() => {
                    setIsOpen(false);
                    setSelectedType(null);
                    setContent('');
                    setRating(null);
                    setSubmitted(false);
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const reset = () => {
        setSelectedType(null);
        setContent('');
        setRating(null);
    };

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-transform"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={t('openFeedback', { defaultValue: '提供回饋' })}
            >
                <MessageSquarePlus size={24} />
            </motion.button>

            {/* Feedback Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {submitted
                                        ? t('thankYou', { defaultValue: '感謝您的回饋！' })
                                        : selectedType
                                            ? t(`types.${selectedType}`, { defaultValue: selectedType })
                                            : t('title', { defaultValue: '告訴我們您的想法' })}
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        reset();
                                    }}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 overflow-y-auto max-h-[60vh]">
                                {submitted ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center mb-4">
                                            <Send size={32} />
                                        </div>
                                        <p className="text-gray-600">
                                            {t('submittedMessage', { defaultValue: '我們會認真閱讀您的每一條回饋。' })}
                                        </p>
                                    </div>
                                ) : !selectedType ? (
                                    /* Type Selection */
                                    <div className="grid grid-cols-2 gap-3">
                                        {FEEDBACK_OPTIONS.map(({ type, icon: Icon, color, bgColor }) => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                className={`p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all active:scale-[0.98] text-left ${bgColor}`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm ${color}`}>
                                                    <Icon size={20} />
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm">
                                                    {t(`types.${type}`, { defaultValue: type })}
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t(`descriptions.${type}`, { defaultValue: '' })}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    /* Feedback Form */
                                    <div className="space-y-4">
                                        {/* Back button */}
                                        <button
                                            onClick={reset}
                                            className="text-sm text-indigo-600 font-medium hover:underline"
                                        >
                                            ← {t('back', { defaultValue: '返回' })}
                                        </button>

                                        {/* Rating (for general feedback) */}
                                        {selectedType === 'general' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {t('ratingLabel', { defaultValue: '整體評分' })}
                                                </label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setRating(star)}
                                                            className={`w-10 h-10 rounded-full transition-all ${rating && rating >= star
                                                                    ? 'bg-amber-400 text-white'
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            <Star size={18} fill={rating && rating >= star ? 'currentColor' : 'none'} className="mx-auto" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Node context (if available) */}
                                        {nodeName && (
                                            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                                                📍 {nodeName}
                                            </div>
                                        )}

                                        {/* Content textarea */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('contentLabel', { defaultValue: '詳細描述' })}
                                            </label>
                                            <textarea
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder={t(`placeholders.${selectedType}`, { defaultValue: '請描述您的想法...' })}
                                                rows={4}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none transition-all"
                                            />
                                        </div>

                                        {/* Submit button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!content.trim() || isSubmitting}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    {t('submit', { defaultValue: '提交回饋' })}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
