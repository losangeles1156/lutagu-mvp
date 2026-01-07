'use client';

import { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { L4QuestionTemplate, L4TemplateCategory } from '@/lib/l4/assistantEngine';

interface L4TemplateSelectorProps {
    templates: L4QuestionTemplate[];
    visibleTemplates: L4QuestionTemplate[];
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    onSelect: (tpl: L4QuestionTemplate) => void;
    locale: 'zh-TW' | 'ja' | 'en';
}

export function L4TemplateSelector({
    templates,
    visibleTemplates,
    isOpen,
    setIsOpen,
    onSelect,
    locale
}: L4TemplateSelectorProps) {
    return (
        <div className="flex justify-center">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs font-bold text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {locale.startsWith('zh') ? '常用問句模板' : locale === 'ja' ? 'テンプレート' : 'Templates'}
            </button>
        </div>
    );
}

interface L4TemplateListProps {
    templates: L4QuestionTemplate[];
    isOpen: boolean;
    onSelect: (tpl: L4QuestionTemplate) => void;
    locale: 'zh-TW' | 'ja' | 'en';
}

export function L4TemplateList({ templates, isOpen, onSelect, locale }: L4TemplateListProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                    {templates.slice(0, 4).map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => onSelect(tpl)}
                            className="text-left rounded-2xl bg-white border border-slate-100 p-3 hover:border-indigo-200 hover:shadow-sm transition-all"
                        >
                            <div className="text-xs font-black text-slate-700">{tpl.title}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{tpl.description}</div>
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
