'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { partnersApi } from '@/lib/api/l1-admin';
import type { L1Partner, PartnersListResponse } from '@/lib/types/l1-admin';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: '', label: '所有狀態' },
    { value: 'active', label: '啟用中' },
    { value: 'inactive', label: '未啟用' },
    { value: 'suspended', label: '已暫停' },
];

export default function PartnersAdminPage() {
    const [partners, setPartners] = useState<L1Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // Filters
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    // Fetch partners
    const fetchPartners = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await partnersApi.list({
                status: status || undefined,
                search: search || undefined,
            });
            setPartners(result.partners);
            setTotal(result.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [status, search]);

    // Refetch when filters change
    useEffect(() => {
        setPage(1);
        fetchPartners();
    }, [status, search, fetchPartners]);

    // Refetch when page changes
    useEffect(() => {
        fetchPartners();
    }, [page, fetchPartners]);

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此合作夥伴嗎？')) return;
        try {
            await partnersApi.delete(id);
            fetchPartners();
        } catch (err: any) {
            alert(`刪除失敗: ${err.message}`);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            suspended: 'bg-red-100 text-red-800',
        };
        const labels: Record<string, string> = {
            active: '啟用中',
            inactive: '未啟用',
            suspended: '已暫停',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>合作夥伴管理</h1>
                    <p className="text-sm text-slate-500 mt-1">管理商業合作夥伴與佣金設定</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPartners}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        重新整理
                    </button>
                    <Link
                        href="/admin/partners/new"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={16} />
                        新增夥伴
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            狀態
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            搜尋
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="輸入名稱搜尋..."
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="admin-card overflow-hidden">
                <table className="admin-table min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                名稱
                            </th>
                            <th className="px-6 py-3 text-left">
                                聯絡方式
                            </th>
                            <th className="px-6 py-3 text-left">
                                佣金比例
                            </th>
                            <th className="px-6 py-3 text-left">
                                狀態
                            </th>
                            <th className="px-6 py-3 text-left">
                                建立時間
                            </th>
                            <th className="px-6 py-3 text-left">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                                    載入中...
                                </td>
                            </tr>
                        ) : partners.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    尚無合作夥伴
                                </td>
                            </tr>
                        ) : (
                            partners.map((partner) => (
                                <tr key={partner.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">
                                            {partner.name}
                                        </div>
                                        {partner.name_ja && (
                                            <div className="text-xs text-slate-400">
                                                {partner.name_ja}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div>{partner.contact_email || '-'}</div>
                                        <div>{partner.contact_phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {partner.commission_rate
                                            ? `${(partner.commission_rate * 100).toFixed(1)}%`
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(partner.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(partner.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/partners/${partner.id}`}
                                                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="編輯"
                                            >
                                                <Pencil size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(partner.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="刪除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
                    <div className="text-sm text-slate-700">
                        顯示 1 至 {Math.min(limit, total)} 筆，共 {total} 筆
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors"
                        >
                            上一頁
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page * limit >= total}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-white transition-colors"
                        >
                            下一頁
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
