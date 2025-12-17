'use client';

import { useAppStore } from '@/stores/appStore';

export function SubscriptionModal() {
    const { isSubscriptionModalOpen, setSubscriptionModalOpen, isTripGuardActive, setTripGuardActive } = useAppStore();

    if (!isSubscriptionModalOpen) return null;

    const handleActivate = () => {
        // Mock Payment / Activation
        setTripGuardActive(true);
        setTimeout(() => setSubscriptionModalOpen(false), 500);
    };

    const handleDeactivate = () => {
        setTripGuardActive(false);
        setSubscriptionModalOpen(false);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">

                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10" />

                <div className="relative z-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg text-3xl">
                        🛡️
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">Trip Guard Plus</h2>
                    <p className="text-gray-500 text-sm">
                        開啟全方位守護，享受無憂東京之旅。
                        <br />
                        包含末班車提醒與緊急叫車服務。
                    </p>

                    <div className="bg-gray-50 p-4 rounded-xl text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-green-500">✓</span>
                            <span className="text-sm font-medium text-gray-700">末班車主動通知</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-green-500">✓</span>
                            <span className="text-sm font-medium text-gray-700">LINE 緊急聯絡網</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-green-500">✓</span>
                            <span className="text-sm font-medium text-gray-700">24h 雙語客服</span>
                        </div>
                    </div>

                    {!isTripGuardActive ? (
                        <button
                            onClick={handleActivate}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                            立即啟用 (7日 / ¥500)
                        </button>
                    ) : (
                        <button
                            onClick={handleDeactivate}
                            className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all"
                        >
                            取消保護
                        </button>
                    )}

                    <button
                        onClick={() => setSubscriptionModalOpen(false)}
                        className="text-xs text-gray-400 underline hover:text-gray-600"
                    >
                        暫時不需要
                    </button>
                </div>
            </div>
        </div>
    );
}
