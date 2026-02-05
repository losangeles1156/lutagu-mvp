'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { placesApi, partnersApi } from '@/lib/api/l1-admin';
import type { L1CustomPlace, L1Partner, PlacesListResponse } from '@/lib/types/l1-admin';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'dining', label: 'Dining' },
    { value: 'leisure', label: 'Leisure' },
    { value: 'culture', label: 'Culture' },
    { value: 'nature', label: 'Nature' },
    { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

export default function L1PlacesAdminPage() {
    const [places, setPlaces] = useState<L1CustomPlace[]>([]);
    const [partners, setPartners] = useState<L1Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // Filters
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [isPartner, setIsPartner] = useState<boolean | undefined>(undefined);

    // Fetch places
    const fetchPlaces = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await placesApi.list({
                category: category || undefined,
                status: status as any || undefined,
                is_partner: isPartner,
                page,
                limit,
            });
            setPlaces(result.places);
            setTotal(result.total);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [category, status, isPartner, page, limit]);

    // Fetch partners for partner selector
    useEffect(() => {
        partnersApi.list().then((result) => {
            setPartners(result.partners);
        }).catch(console.error);
    }, []);

    // Refetch when filters change
    useEffect(() => {
        setPage(1);
        fetchPlaces();
    }, [category, status, isPartner, fetchPlaces]);

    // Refetch when page changes
    useEffect(() => {
        fetchPlaces();
    }, [page, fetchPlaces]);

    const handleApprove = async (id: string) => {
        try {
            await placesApi.approve(id);
            fetchPlaces();
        } catch (err: any) {
            alert(`Failed to approve: ${err.message}`);
        }
    };

    const handleReject = async (id: string) => {
        try {
            await placesApi.reject(id);
            fetchPlaces();
        } catch (err: any) {
            alert(`Failed to reject: ${err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this place?')) return;
        try {
            await placesApi.delete(id);
            fetchPlaces();
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            draft: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-100'}`}>
                {status}
            </span>
        );
    };

    const getPartnerName = (partnerId?: string) => {
        if (!partnerId) return '-';
        const partner = partners.find((p) => p.id === partnerId);
        return partner?.name || partnerId.slice(0, 8);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                        L1 場所管理
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">管理用戶自建場所與合作夥伴景點</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/admin/l1-places/analytics"
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                    >
                        分析報表
                    </Link>
                    <Link
                        href="/admin/l1-places/batch"
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50"
                    >
                        批次操作
                    </Link>
                    <Link
                        href="/admin/l1-places/new"
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800"
                    >
                        + 新增場所
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-card p-4">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            類別
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
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
                            合作類型
                        </label>
                        <select
                            value={isPartner === undefined ? '' : isPartner.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setIsPartner(val === '' ? undefined : val === 'true');
                            }}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400"
                        >
                            <option value="">全部</option>
                            <option value="true">合作夥伴</option>
                            <option value="false">非合作</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl">
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
                                類別
                            </th>
                            <th className="px-6 py-3 text-left">
                                合作夥伴
                            </th>
                            <th className="px-6 py-3 text-left">
                                狀態
                            </th>
                            <th className="px-6 py-3 text-left">
                                權重
                            </th>
                            <th className="px-6 py-3 text-left">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                                    載入中...
                                </td>
                            </tr>
                        ) : places.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                                    尚無資料
                                </td>
                            </tr>
                        ) : (
                            places.map((place) => (
                                <tr key={place.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-900">
                                            {place.name_i18n?.['zh-TW'] || place.name_i18n?.ja || Object.values(place.name_i18n)[0]}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {place.station_id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {place.category}
                                        {place.subcategory && ` / ${place.subcategory}`}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {place.is_partner ? (
                                            <span className="text-slate-900 font-medium">
                                                {getPartnerName(place.partner_id)}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(place.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {place.priority}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/l1-places/${place.id}`}
                                                className="text-slate-900 hover:text-slate-700"
                                            >
                                                編輯
                                            </Link>
                                            {place.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(place.id)}
                                                        className="text-emerald-700 hover:text-emerald-900"
                                                    >
                                                        核准
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(place.id)}
                                                        className="text-rose-700 hover:text-rose-900"
                                                    >
                                                        拒絕
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(place.id)}
                                                className="text-rose-700 hover:text-rose-900"
                                            >
                                                刪除
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
                        顯示 {((page - 1) * limit) + 1} 至 {Math.min(page * limit, total)} 筆，共 {total} 筆
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
                        >
                            上一頁
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page * limit >= total}
                            className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
                        >
                            下一頁
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
