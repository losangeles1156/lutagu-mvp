'use client';

import dynamic from 'next/dynamic';

const ChatPanel = dynamic(
    () => import('@/components/chat/ChatPanel').then(m => ({ default: m.ChatPanel })),
    { ssr: false, loading: () => <div className="h-full bg-slate-50 animate-pulse rounded-2xl" /> }
);

export function ChatSection() {
    return <ChatPanel />;
}
