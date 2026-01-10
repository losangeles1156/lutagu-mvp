
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Lightbulb, 
    AlertTriangle, 
    Accessibility, 
    Info, 
    ChevronRight,
    MapPin
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface KnowledgeItem {
    id: string;
    section: string;
    content: string;
    type: 'tip' | 'warning' | 'accessibility' | 'timing' | 'info';
    icon: string;
    priority: number;
}

interface L4KnowledgeSectionProps {
    knowledge: KnowledgeItem[];
    isLoading?: boolean;
}

export const L4KnowledgeSection: React.FC<L4KnowledgeSectionProps> = ({ knowledge, isLoading }) => {
    const t = useTranslations('l4');

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (!knowledge || knowledge.length === 0) {
        return null;
    }

    // Sort by priority
    const sortedKnowledge = [...knowledge].sort((a, b) => b.priority - a.priority);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 px-1">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Lightbulb size={18} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                    {t('expertKnowledge', { defaultValue: '專家攻略' })}
                </h3>
            </div>

            <div className="grid gap-4">
                {sortedKnowledge.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`
                            relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md
                            ${item.type === 'warning' ? 'border-amber-100' : 'border-slate-100'}
                        `}
                    >
                        {/* Type Indicator */}
                        <div className={`
                            absolute top-0 left-0 w-1 h-full
                            ${item.type === 'warning' ? 'bg-amber-400' : 
                              item.type === 'accessibility' ? 'bg-blue-400' : 
                              item.type === 'tip' ? 'bg-emerald-400' : 'bg-slate-300'}
                        `} />

                        <div className="flex items-start gap-4">
                            <div className={`
                                shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl
                                ${item.type === 'warning' ? 'bg-amber-50' : 
                                  item.type === 'accessibility' ? 'bg-blue-50' : 
                                  item.type === 'tip' ? 'bg-emerald-50' : 'bg-slate-50'}
                            `}>
                                {item.icon}
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        {item.section}
                                    </span>
                                    {item.type === 'warning' && (
                                        <span className="flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                                            <AlertTriangle size={10} />
                                            Important
                                        </span>
                                    )}
                                </div>
                                
                                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
