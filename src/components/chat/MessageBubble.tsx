'use client';

import { memo, useState } from 'react';
import { Bot, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ParsedMessageContent } from './ParsedMessageContent';
import { CommerceCard } from './cards/CommerceCard';
import { ActionCard, Action as ChatAction } from './ActionCard';
import { AgenticResponseCard } from './AgenticResponseCard';
import { ThinkingPlanCard } from './ThinkingPlanCard';

interface MessageBubbleProps {
    msg: any;
    idx: number;
    handleAction: (action: ChatAction) => void;
    handleFeedback?: (index: number, score: number) => void;
    variant?: 'default' | 'compact' | 'l4';
}

export const MessageBubble = memo(({
    msg,
    idx,
    handleAction,
    handleFeedback,
    variant = 'default'
}: MessageBubbleProps) => {
    // Feedback state to prevent duplicate clicks
    const [feedbackGiven, setFeedbackGiven] = useState<number | null>(null);

    // Check for Tool Invocations
    const toolInvocations = msg.toolInvocations;

    // Legacy actions support (for Demo Mode)
    const legacyActions = msg.data?.actions || msg.actions;

    const isL4 = variant === 'l4';

    // DEBUG: Logs
    if (msg.role === 'assistant' && (msg.content || '').includes('HYBRID_DATA')) {
        console.log('[DEBUG MessageBubble] Raw content contains HYBRID_DATA tag!', msg.id);
    }
    if (msg.role === 'assistant') {
        console.log(`[DEBUG MessageBubble] Render msg[${idx}]:`, {
            id: msg.id,
            hasType: !!msg.type,
            type: msg.type,
            hasData: !!msg.data,
            dataKeys: Object.keys(msg.data || {}),
        });
    }

    return (
        <div
            className={`prose flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid="chat-message-text"
        >
            <div className={`
                max-w-[85%] p-4 rounded-2xl shadow-sm
                ${msg.role === 'user'
                    ? (isL4 ? 'bg-slate-900 text-white rounded-br-none' : 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg')
                    : (isL4 ? 'bg-white text-slate-700 rounded-tl-none border border-slate-200/50' : 'bg-white text-slate-800 rounded-bl-lg border border-slate-100')
                }
            `}>
                {/* AI Label for L4 variant */}
                {isL4 && msg.role !== 'user' && (
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-40">
                        <Bot size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">LUTAGU</span>
                    </div>
                )}

                {/* Message Content with Markdown and Thinking Process */}
                <ParsedMessageContent content={msg.content} role={msg.role} thought={msg.thought} />

                {/* AI Agent 2.0 - Thinking Plan Card */}
                {msg.agentPlan && (
                    <ThinkingPlanCard plan={msg.agentPlan} />
                )}

                {/* Phase 5: Agentic UI - Render Structured Response */}
                {(msg.type || (msg.data && Object.keys(msg.data).length > 0)) && (
                    <AgenticResponseCard
                        type={msg.type || (msg.data?.type)}
                        data={msg.data}
                        source={msg.source}
                        onAction={handleAction}
                    />
                )}

                {/* Render Legacy Actions (Grouped) */}
                {legacyActions && legacyActions.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                        {(() => {
                            // [PRO MAX] Separate Commercial Actions
                            const commercialActions = legacyActions.filter((a: any) =>
                                a.metadata?.category === 'commercial' || a.type === 'commercial' || a.metadata?.vendor
                            );
                            const otherActions = legacyActions.filter((a: any) =>
                                !(a.metadata?.category === 'commercial' || a.type === 'commercial' || a.metadata?.vendor)
                            );

                            return (
                                <>
                                    {/* Render Commercial Cards (Radical Design) */}
                                    {commercialActions.map((action: any, i: number) => (
                                        <CommerceCard
                                            key={`comm-${i}`}
                                            type={action.metadata?.vendor || 'generic'}
                                            title={typeof action.label === 'string' ? action.label : (action.label as any)['zh-TW'] || action.label['en']}
                                            description={action.metadata?.description || 'Exclusive offer for you.'}
                                            actionLabel="查看詳情"
                                            url={action.target}
                                            imageUrl={action.metadata?.image}
                                            price={action.metadata?.price}
                                            onClick={() => handleAction(action)}
                                        />
                                    ))}

                                    {/* Standard Actions Grouping */}
                                    {(() => {
                                        if (otherActions.length === 0) return null;

                                        const groups = otherActions.reduce((acc: any, action: any) => {
                                            const category = action.metadata?.category || 'other';
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(action);
                                            return acc;
                                        }, {});

                                        const categories = Object.keys(groups);

                                        if (categories.length === 1 || otherActions.length <= 3) {
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {otherActions.map((action: any, i: number) => (
                                                        <ActionCard key={i} action={action} onClick={handleAction} />
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return categories.map((cat) => (
                                            <details key={cat} className="group/accordion bg-slate-50 rounded-xl border border-slate-100 open:bg-white transition-colors" open={cat === 'recommendation' || cat === 'navigation'}>
                                                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none">
                                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-open/accordion:text-indigo-600">
                                                        {cat.replace(/_/g, ' ')} ({groups[cat].length})
                                                    </span>
                                                    <div className="text-slate-400 group-open/accordion:rotate-180 transition-transform">
                                                        ▼
                                                    </div>
                                                </summary>
                                                <div className="px-3 pb-3 pt-0 flex flex-col gap-2">
                                                    {groups[cat].map((action: any, i: number) => (
                                                        <ActionCard key={i} action={action} onClick={handleAction} />
                                                    ))}
                                                </div>
                                            </details>
                                        ));
                                    })()}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Render Tools - Phase 4 Logic */}
                {toolInvocations && toolInvocations.map((toolInvocation: any) => {
                    const { toolName, toolCallId, state, result } = toolInvocation;

                    if (state === 'result') {
                        if (toolName === 'calculate_tpi') {
                            return (
                                <div key={toolCallId} className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 mb-1">TRANSFER PAIN INDEX</div>
                                    <div className="text-lg font-black text-indigo-600">{result.score || 'N/A'} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
                                    <div className="text-sm font-bold text-slate-700">{result.recommendation}</div>
                                </div>
                            );
                        }
                        if (toolName === 'evaluate_delay_risk') {
                            return (
                                <div key={toolCallId} className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="text-xs font-bold text-amber-600 mb-1">DELAY RISK (CDR)</div>
                                    <div className="text-sm font-bold text-slate-800">{result.recommendation || 'Low Risk'}</div>
                                </div>
                            );
                        }
                        return null;
                    } else {
                        return (
                            <div key={toolCallId} className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Using {toolName}...</span>
                            </div>
                        );
                    }
                })}

                {/* Feedback Buttons (Only for assistant messages, and if handler provided) */}
                {msg.role === 'assistant' && !msg.isLoading && handleFeedback && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100/50">
                        <button
                            onClick={() => {
                                if (feedbackGiven === null) {
                                    setFeedbackGiven(1);
                                    handleFeedback(idx, 1);
                                }
                            }}
                            disabled={feedbackGiven !== null}
                            className={`p-1.5 hover:bg-slate-100 rounded-full transition-colors ${feedbackGiven === 1 ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <ThumbsUp size={14} />
                        </button>
                        <button
                            onClick={() => {
                                if (feedbackGiven === null) {
                                    setFeedbackGiven(-1);
                                    handleFeedback(idx, -1);
                                }
                            }}
                            disabled={feedbackGiven !== null}
                            className={`p-1.5 hover:bg-slate-100 rounded-full transition-colors ${feedbackGiven === -1 ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-rose-500'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <ThumbsDown size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble';
