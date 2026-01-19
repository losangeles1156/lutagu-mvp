'use client';

import { useEffect } from 'react';
import { RefreshCcw, Home, AlertCircle } from 'lucide-react';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Unhandled Admin Runtime Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mb-8 animate-in zoom-in duration-300">
                <AlertCircle className="w-10 h-10 text-rose-600" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                系統發生錯誤
            </h1>

            <p className="text-slate-500 max-w-xs mb-10 leading-relaxed font-medium">
                管理後台載入時發生問題，請嘗試重新整理。
            </p>

            <div className="flex flex-col w-full max-w-xs gap-3">
                <button
                    onClick={() => reset()}
                    className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                    <RefreshCcw size={20} />
                    <span>重新整理</span>
                </button>

                <button
                    onClick={() => window.location.href = '/admin'}
                    className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all active:scale-95"
                >
                    <Home size={20} />
                    <span>回到管理首頁</span>
                </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
                <div className="mt-12 p-4 bg-slate-100 rounded-xl text-left overflow-auto max-w-full">
                    <p className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap">
                        {error.message}
                        {error.stack && `\n\n${error.stack}`}
                    </p>
                </div>
            )}
        </div>
    );
}
