
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

    const warnings = knowledge.filter(k => k.type === 'warning').sort((a, b) => b.priority - a.priority);
    const tips = knowledge.filter(k => k.type === 'tip').sort((a, b) => b.priority - a.priority);
    const others = knowledge.filter(k => k.type !== 'warning' && k.type !== 'tip').sort((a, b) => b.priority - a.priority);

    const renderCard = (item: KnowledgeItem) => (
        <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md
                ${item.type === 'warning' ? 'border-red-100 bg-red-50/10' :
                    item.type === 'tip' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}
            `}
        >
            <div className={`
                absolute top-0 left-0 w-1 h-full
                ${item.type === 'warning' ? 'bg-red-500' :
                    item.type === 'tip' ? 'bg-emerald-500' :
                        item.type === 'accessibility' ? 'bg-blue-400' : 'bg-slate-300'}
            `} />

            <div className="flex items-start gap-4">
                <div className={`
                    shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm
                    ${item.type === 'warning' ? 'bg-red-100 text-red-600' :
                        item.type === 'tip' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-500'}
                `}>
                    {item.icon}
                </div>

                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-black uppercase tracking-widest ${item.type === 'warning' ? 'text-red-400' :
                            item.type === 'tip' ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                            {item.section}
                        </span>
                        {item.type === 'warning' && (
                            <span className="flex items-center gap-1 text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                                <AlertTriangle size={10} />
                                TRAP
                            </span>
                        )}
                        {item.type === 'tip' && (
                            <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase">
                                <Lightbulb size={10} />
                                HACK
                            </span>
                        )}
                    </div>

                    <div className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        {item.content}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8 pb-8">
            {/* 1. Warnings Section (Traps) */}
            {warnings.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                            <AlertTriangle size={16} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">轉乘陷阱</h3>
                            <p className="text-[10px] font-bold text-red-400/80">Transfer Traps & Warnings</p>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        {warnings.map(renderCard)}
                    </div>
                </section>
            )}

            {/* 2. Tips Section (Hacks) */}
            {tips.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                            <Lightbulb size={16} className="text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">專家密技</h3>
                            <p className="text-[10px] font-bold text-emerald-500/60">Local Hacks & Tips</p>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        {tips.map(renderCard)}
                    </div>
                </section>
            )}

            {/* 3. General Info Section */}
            {others.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                            <Info size={16} className="text-slate-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">政策與設施情報</h3>
                            <p className="text-[10px] font-bold text-slate-400">Policies, Tickets & Facilities</p>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        {others.map(renderCard)}
                    </div>
                </section>
            )}
        </div>
    );
};
