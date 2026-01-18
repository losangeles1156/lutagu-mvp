'use client';

import { logger } from '@/lib/utils/logger';

import { useState, useEffect, useCallback } from 'react';
import { L1CustomPlace, PlaceStatus } from '@/lib/types/l1-admin';
import { L1PlaceEditor } from './L1PlaceEditor';
import { Search, Filter, Plus, Edit, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
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

    // Fetch Stations
    useEffect(() => {
        fetch('/api/admin/stations')
            .then(res => res.json())
            .then(data => setStations(data.stations || []))
            .catch(() => {
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
            logger.error(error);
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
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 min-h-[600px]">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <select
                            value={selectedStation}
                            onChange={e => setSelectedStation(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white min-w-[180px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">所有車站</option>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'pending' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            待審核
                        </button>
                        <button
                            onClick={() => setStatusFilter('approved')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'approved' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            已發布
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${statusFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            全部
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchPlaces}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        title="重新整理"
                    >
                        <Search size={18} />
                    </button>
                    <button
                        onClick={() => { setEditingPlace(null); setIsEditorOpen(true); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={16} /> 新增 POI
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱 / ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">短評 (Review)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-400">載入中...</td></tr>
                        ) : places.length === 0 ? (
                            <tr><td colSpan={5} className="py-10 text-center text-gray-400">無資料</td></tr>
                        ) : places.map(place => (
                            <tr key={place.id} className="hover:bg-gray-50 group transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{place.name_i18n.ja || place.name_i18n.en}</div>
                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <span className="truncate max-w-[150px]">{place.station_id}</span>
                                        {place.affiliate_url && <ExternalLink size={10} className="text-indigo-400" />}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">
                                        {place.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate text-gray-600">
                                    {place.description_i18n?.['zh-TW'] || '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${place.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            place.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {place.status === 'approved' ? '已發布' :
                                            place.status === 'pending' ? '待審核' :
                                                '草稿'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        {place.status === 'pending' && (
                                            <button
                                                onClick={() => handleApprove(place.id)}
                                                title="批准"
                                                className="p-1.5 hover:bg-green-100 text-green-600 rounded transition-colors"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setEditingPlace(place); setIsEditorOpen(true); }}
                                            title="編輯"
                                            className="p-1.5 hover:bg-indigo-100 text-indigo-600 rounded transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(place.id)}
                                            title="刪除"
                                            className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                                        >
                                            <Trash2 size={18} />
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
