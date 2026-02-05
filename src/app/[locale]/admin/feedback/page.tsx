'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { MessageSquare, Star, Bug, MapPin, Lightbulb, RefreshCw, Eye, CheckCircle } from 'lucide-react';

interface FeedbackItem {
    id: string;
    feedback_type: string;
    category: string | null;
    title: string | null;
    content: string;
    rating: number | null;
    node_id: string | null;
    status: string;
    created_at: string;
    metadata: {
        userAgent?: string;
        locale?: string;
    };
}

const TYPE_CONFIG: Record<string, { icon: typeof Star; color: string; label: string }> = {
    general: { icon: Star, color: 'text-amber-600 bg-amber-50', label: '使用感受' },
    bug: { icon: Bug, color: 'text-red-600 bg-red-50', label: '問題回報' },
    spot: { icon: MapPin, color: 'text-emerald-600 bg-emerald-50', label: '景點情報' },
    tip: { icon: Lightbulb, color: 'text-blue-600 bg-blue-50', label: '經驗分享' },
};

export default function FeedbackAdminPage() {
    const locale = useLocale();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/feedback');
            if (res.ok) {
                const data = await res.json();
                setFeedback(data.feedback || []);
            }
        } catch (error) {
            console.error('Failed to fetch feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    const filteredFeedback = selectedType
        ? feedback.filter((f) => f.feedback_type === selectedType)
        : feedback;

    const stats = {
        total: feedback.length,
        general: feedback.filter((f) => f.feedback_type === 'general').length,
        bug: feedback.filter((f) => f.feedback_type === 'bug').length,
        spot: feedback.filter((f) => f.feedback_type === 'spot').length,
        tip: feedback.filter((f) => f.feedback_type === 'tip').length,
        pending: feedback.filter((f) => f.status === 'pending').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>用戶反饋</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        查看與管理用戶提交的反饋
                    </p>
                </div>
                <button
                    onClick={fetchFeedback}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    重新整理
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setSelectedType(null)}
                    className={`p-4 rounded-2xl border-2 transition-all ${selectedType === null ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                >
                    <div className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{stats.total}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">All</div>
                </button>
                {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon;
                    const count = stats[type as keyof typeof stats] || 0;
                    return (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`p-4 rounded-2xl border-2 transition-all ${selectedType === type ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-xl ${config.color}`}>
                                    <Icon size={14} />
                                </div>
                                <span className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>{count}</span>
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">{config.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* Feedback List */}
            <div className="admin-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
                        載入中...
                    </div>
                ) : filteredFeedback.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <div className="font-medium">尚無反饋</div>
                        <div className="text-sm">用戶提交的反饋將顯示於此</div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredFeedback.map((item) => {
                            const config = TYPE_CONFIG[item.feedback_type] || TYPE_CONFIG.general;
                            const Icon = config.icon;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-xl ${config.color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                    {config.label}
                                                </span>
                                                {item.rating && (
                                                    <span className="text-xs text-amber-500 font-bold">
                                                        {'★'.repeat(item.rating)}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    item.status === 'reviewed' ? 'bg-slate-100 text-slate-700' :
                                                        'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-800 line-clamp-2">
                                                {item.content}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-2">
                                                {new Date(item.created_at).toLocaleString(locale)}
                                                {item.node_id && (
                                                    <span className="ml-2">• {item.node_id.split('.').pop()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Eye className="text-slate-300" size={16} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>反饋詳情</h3>
                                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">類型</div>
                                <div className="text-sm text-slate-800">{TYPE_CONFIG[selectedItem.feedback_type]?.label || selectedItem.feedback_type}</div>
                            </div>
                            {selectedItem.rating && (
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">評分</div>
                                    <div className="text-amber-500 text-lg">{'★'.repeat(selectedItem.rating)}{'☆'.repeat(5 - selectedItem.rating)}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">內容</div>
                                <div className="text-sm text-slate-800 whitespace-pre-wrap">{selectedItem.content}</div>
                            </div>
                            {selectedItem.node_id && (
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">節點</div>
                                    <div className="text-sm text-slate-800">{selectedItem.node_id}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">提交時間</div>
                                <div className="text-sm text-slate-800">{new Date(selectedItem.created_at).toLocaleString()}</div>
                            </div>
                            {selectedItem.metadata && (
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">元數據</div>
                                    <pre className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg overflow-auto">
                                        {JSON.stringify(selectedItem.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
