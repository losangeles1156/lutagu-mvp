'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { useNodeStore } from '@/stores/nodeStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';

const FeedbackHub = dynamic(
    () => import('@/components/feedback/FeedbackHub').then(m => ({ default: m.FeedbackHub })),
    { ssr: false }
);

interface BottomNavBarProps {
    nodeData: any;
}

export function BottomNavBar({ nodeData }: BottomNavBarProps) {
    const tNav = useTranslations('nav');
    const tCommon = useTranslations('common');
    const currentNodeId = useNodeStore(s => s.currentNodeId);
    const { transitionTo } = useUIStateMachine();

    return (
        <nav className="mx-auto max-w-md px-4 pb-[env(safe-area-inset-bottom)]" aria-label={tNav('navigation')}>
            <div className="h-[76px] bg-white/95 backdrop-blur-xl border border-black/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.10)] rounded-[28px] flex items-center justify-between px-3 gap-3" role="tablist">

                {/* Feedback Button (Integrated) */}
                <FeedbackHub nodeId={currentNodeId || undefined} nodeName={nodeData?.name?.en || nodeData?.name?.ja || undefined}>
                    <button
                        className="w-16 h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
                        aria-label={tCommon('feedback')}
                    >
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                            <MessageSquarePlus size={20} className="text-slate-500" />
                        </div>
                        <span className="text-[10px] font-bold">{tCommon('feedback')}</span>
                    </button>
                </FeedbackHub>

                {/* Primary AI Chat Action */}
                <button
                    onClick={() => {
                        console.log('[BottomNavBar] AI button clicked, transitioning to fullscreen');
                        transitionTo('fullscreen');
                    }}
                    className="flex-1 h-[60px] rounded-[22px] bg-gradient-to-r from-indigo-600 to-indigo-800 text-white flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:shadow-[0_12px_28px_rgba(79,70,229,0.4)]"
                    aria-label={tCommon('openChat')}
                    data-testid="open-ai-chat"
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <MessageSquare size={18} className="text-white" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-base font-black tracking-wide">{tCommon('aiGuide')}</span>
                        <span className="text-[10px] font-medium text-indigo-100 opacity-90">{tCommon('aiGuideSubtitle')}</span>
                    </div>
                </button>
            </div>
        </nav>
    );
}
