'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { AgentPlan, TodoItem } from '@/lib/agent/types';

interface ThinkingPlanCardProps {
    plan: AgentPlan;
    isError?: boolean;
}

export const ThinkingPlanCard: React.FC<ThinkingPlanCardProps> = ({ plan, isError }) => {
    if (!plan || !plan.items) return null;

    return (
        <div className={`my-4 overflow-hidden rounded-xl border bg-white/50 shadow-sm backdrop-blur-md transition-all duration-300 dark:bg-zinc-900/50 ${isError ? 'border-red-200 dark:border-red-900/30' : 'border-zinc-200 dark:border-zinc-800'
            }`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b px-4 py-3 ${isError ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-zinc-50/50 dark:bg-zinc-800/30'
                }`}>
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {isError ? 'Plan Parsing Error' : (plan.title || 'Current Plan')}
                </h3>
                {isError ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        Agent Strategy
                    </span>
                )}
            </div>

            {/* Todo List */}
            <div className="p-2">
                <ul className="space-y-1">
                    {plan.items.map((item) => (
                        <TodoListItem key={item.id} item={item} />
                    ))}
                </ul>
            </div>

            {/* Footer / Meta */}
            {!isError && plan.updatedAt && (
                <div className="border-t px-4 py-2 opacity-50">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Updated at {new Date(plan.updatedAt).toLocaleTimeString()}
                    </p>
                </div>
            )}
        </div>
    );
};

const TodoListItem: React.FC<{ item: TodoItem }> = ({ item }) => {
    const getStatusIcon = () => {
        switch (item.status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'in_progress':
                return <Clock className="h-4 w-4 animate-spin text-blue-500 [animation-duration:3s]" />;
            default:
                return <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />;
        }
    };

    const getStatusStyles = () => {
        switch (item.status) {
            case 'completed':
                return 'text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-700';
            case 'in_progress':
                return 'text-blue-600 font-medium dark:text-blue-400';
            default:
                return 'text-zinc-600 dark:text-zinc-300';
        }
    };

    return (
        <li className={`flex items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-200 ${item.status === 'in_progress' ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
            }`}>
            <div className="mt-0.5 shrink-0">
                {getStatusIcon()}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-sm leading-tight {getStatusStyles()}`}>
                    {item.content}
                </p>
                {item.activeForm && item.status === 'in_progress' && (
                    <p className="mt-1 text-[11px] italic text-blue-400 animate-pulse">
                        {item.activeForm}
                    </p>
                )}
            </div>
        </li>
    );
};
