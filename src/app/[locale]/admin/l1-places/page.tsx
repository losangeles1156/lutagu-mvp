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
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">L1 Places Management</h1>
                <div className="flex gap-2">
                    <Link
                        href="/admin/l1-places/analytics"
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        Analytics
                    </Link>
                    <Link
                        href="/admin/l1-places/batch"
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Batch Ops
                    </Link>
                    <Link
                        href="/admin/l1-places/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        + Add New Place
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="border rounded px-3 py-2"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border rounded px-3 py-2"
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Partner Type
                        </label>
                        <select
                            value={isPartner === undefined ? '' : isPartner.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setIsPartner(val === '' ? undefined : val === 'true');
                            }}
                            className="border rounded px-3 py-2"
                        >
                            <option value="">All</option>
                            <option value="true">Partner Only</option>
                            <option value="false">Non-Partner</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Partner
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Priority
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : places.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No places found
                                </td>
                            </tr>
                        ) : (
                            places.map((place) => (
                                <tr key={place.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {place.name_i18n?.['zh-TW'] || place.name_i18n?.ja || Object.values(place.name_i18n)[0]}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {place.station_id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {place.category}
                                        {place.subcategory && ` / ${place.subcategory}`}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {place.is_partner ? (
                                            <span className="text-blue-600">
                                                {getPartnerName(place.partner_id)}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(place.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {place.priority}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/l1-places/${place.id}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Edit
                                            </Link>
                                            {place.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(place.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(place.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDelete(place.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page * limit >= total}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
