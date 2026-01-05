'use client';

import { useState, useEffect, useCallback } from 'react';
import { L1CustomPlace, PlaceStatus } from '@/lib/types/l1-admin';
import { L1PlaceEditor } from './L1PlaceEditor';
import { Search, Filter, Plus, Edit, Trash2, CheckCircle, Eye, ExternalLink, Star } from 'lucide-react';
import { toast } from 'sonner';

export function L1AuditList() {
    const [places, setPlaces] = useState<L1CustomPlace[]>([]);
    const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedStation, setSelectedStation] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<PlaceStatus | 'all'>('pending');

    // Modal
    const [editingPlace, setEditingPlace] = useState<L1CustomPlace | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Fetch Stations (Simplified fetch, ideally should be from an API or Store)
    useEffect(() => {
        // Quick fetch for stations filter
        fetch('/api/admin/stations') // Assuming this endpoint exists or similar
            .then(res => res.json())
            .then(data => setStations(data.stations || []))
            .catch(() => {
                // Fallback or use hardcoded common stations for MVP
                setStations([
                    { id: 'odpt:Station:JR-East.Ueno', name: '上野 (Ueno)' },
                    { id: 'odpt:Station:JR-East.Tokyo', name: '東京 (Tokyo)' },
                    { id: 'odpt:Station:JR-East.Shinjuku', name: '新宿 (Shinjuku)' },
                    { id: 'odpt:Station:JR-East.Shibuya', name: '渋谷 (Shibuya)' },
                ]);
            });
    }, []);

    const fetchPlaces = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedStation) params.set('station_id', selectedStation);
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const res = await fetch(`/api/admin/l1-places?${params.toString()}`);
            const data = await res.json();
            setPlaces(data.places || []);
        } catch (error) {
            console.error(error);
            toast.error('無法載入列表');
        } finally {
            setLoading(false);
        }
    }, [selectedStation, statusFilter]);

    useEffect(() => {
        fetchPlaces();
    }, [fetchPlaces]);

    const handleApprove = async (id: string) => {
        try {
            await fetch(`/api/admin/l1-places/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved', is_active: true })
            });
            toast.success('已批准顯示');
            fetchPlaces();
        } catch {
            toast.error('操作失敗');
        }
    };

    const handleFeature = async (id: string, current: boolean) => {
        // Assuming Feature is a tag or priority update, here simplified as priority bump
        // Actual implementation depends on backend support for 'is_featured'
        // For now let's just toast
        toast.info('Feature toggle not fully implemented yet');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要永久刪除此 POI 嗎？')) return;
        try {
            await fetch(`/api/admin/l1-places/${id}`, { method: 'DELETE' });
            toast.success('已刪除');
            fetchPlaces();
        } catch {
            toast.error('刪除失敗');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow border p-6 min-h-[600px]">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <select
                            value={selectedStation}
                            onChange={e => setSelectedStation(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm appearance-none bg-white min-w-[180px]"
                        >
                            <option value="">所有車站</option>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'pending' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            待審核 (Pending)
                        </button>
                        <button
                            onClick={() => setStatusFilter('approved')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'approved' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                        >
                            已發布 (Approved)
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                        >
                            全部
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchPlaces}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        title="重新整理"
                    >
                        <Search size={18} />
                    </button>
                    <button
                        onClick={() => { setEditingPlace(null); setIsEditorOpen(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-700"
                    >
                        <Plus size={16} /> 新增 POI
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="px-4 py-3 text-left font-medium text-gray-500">名稱 / ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">分類</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">短評 (Review)</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">狀態</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-400">載入中...</td></tr>
                        ) : places.length === 0 ? (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-400">無資料</td></tr>
                        ) : places.map(place => (
                            <tr key={place.id} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3">
                                    <div className="font-bold text-gray-800">{place.name_i18n.ja || place.name_i18n.en}</div>
                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                        {place.station_id}
                                        {place.affiliate_url && <ExternalLink size={10} className="text-blue-400" />}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                                        {place.category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                                    {place.description_i18n?.['zh-TW'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${place.status === 'approved' ? 'bg-green-500' :
                                            place.status === 'pending' ? 'bg-yellow-500' :
                                                'bg-gray-300'
                                        }`} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleApprove(place.id)}
                                            title="批准"
                                            className="p-1.5 hover:bg-green-100 text-green-600 rounded"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingPlace(place); setIsEditorOpen(true); }}
                                            title="編輯"
                                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(place.id)}
                                            title="刪除"
                                            className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isEditorOpen && (
                <L1PlaceEditor
                    place={editingPlace}
                    stations={stations}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={fetchPlaces}
                />
            )}
        </div>
    );
}
