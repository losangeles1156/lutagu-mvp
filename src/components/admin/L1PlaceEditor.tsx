'use client';

import { useState } from 'react';
import { X, Save, MapPin } from 'lucide-react';
import { L1CustomPlace, CreatePlaceRequest, UpdatePlaceRequest } from '@/lib/types/l1-admin';
import { toast } from 'sonner';

interface L1PlaceEditorProps {
    place?: L1CustomPlace | null; // If null, create mode
    stations: { id: string; name: string }[];
    onClose: () => void;
    onSave: () => void;
}

export function L1PlaceEditor({ place, stations, onClose, onSave }: L1PlaceEditorProps) {
    const isEdit = !!place;
    const [loading, setLoading] = useState(false);

    // Form State
    const [stationId, setStationId] = useState(place?.station_id || '');
    const [category, setCategory] = useState(place?.category || 'shopping');
    const [nameJa, setNameJa] = useState(place?.name_i18n?.ja || '');
    const [nameEn, setNameEn] = useState(place?.name_i18n?.en || '');
    const [nameZh, setNameZh] = useState(place?.name_i18n?.['zh-TW'] || '');
    const [review, setReview] = useState(place?.description_i18n?.['zh-TW'] || '');
    const [url, setUrl] = useState(place?.affiliate_url || '');
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(place?.location || null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body: Partial<CreatePlaceRequest> = {
                station_id: stationId,
                category,
                name_i18n: { ja: nameJa, en: nameEn, 'zh-TW': nameZh },
                description_i18n: { 'zh-TW': review }, // Storing review in description for now
                affiliate_url: url,
                location: coords || undefined
            };

            const endpoint = isEdit
                ? `/api/admin/l1-places/${place.id}`
                : '/api/admin/l1-places';

            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Save failed');

            toast.success(isEdit ? '已更新景點' : '已建立新景點');
            onSave();
            onClose();

        } catch (error) {
            console.error(error);
            toast.error('儲存失敗');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{isEdit ? '編輯景點' : '新增景點'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">所屬車站</label>
                            <select
                                required
                                value={stationId}
                                onChange={e => setStationId(e.target.value)}
                                className="w-full border rounded-lg p-2"
                                disabled={isEdit} // Prevent moving stations for now for simplicity
                            >
                                <option value="">選擇車站...</option>
                                {stations.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="shopping">購物 (Shopping)</option>
                                <option value="food">美食 (Food)</option>
                                <option value="attraction">景點 (Attraction)</option>
                                <option value="hotel">住宿 (Hotel)</option>
                                <option value="service">服務 (Service)</option>
                            </select>
                        </div>
                    </div>

                    {/* Names */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">名稱 (Multilingual)</label>
                        <div className="grid grid-cols-3 gap-3">
                            <input
                                placeholder="日本語名稱"
                                value={nameJa}
                                onChange={e => setNameJa(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                            <input
                                placeholder="English Name"
                                value={nameEn}
                                onChange={e => setNameEn(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                            <input
                                placeholder="中文名稱"
                                value={nameZh}
                                onChange={e => setNameZh(e.target.value)}
                                className="border rounded-lg p-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* Review & Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">短評 (Review)</label>
                        <textarea
                            rows={3}
                            value={review}
                            onChange={e => setReview(e.target.value)}
                            placeholder="輸入關於此地點的短評或推薦理由..."
                            className="w-full border rounded-lg p-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">外部連結 (Affiliate URL)</label>
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full border rounded-lg p-2 text-sm"
                        />
                    </div>

                    {/* Location (Simplified for now - Manual Input) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                            <MapPin size={16} /> 座標位置
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                step="any"
                                placeholder="Latitude (緯度)"
                                value={coords?.lat || ''}
                                onChange={e => setCoords(prev => ({ ...prev!, lat: parseFloat(e.target.value) }))}
                                className="border rounded px-2 py-1 text-sm"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Longitude (經度)"
                                value={coords?.lng || ''}
                                onChange={e => setCoords(prev => ({ ...prev!, lng: parseFloat(e.target.value) }))}
                                className="border rounded px-2 py-1 text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * 建議從 Google Maps 複製座標
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !stationId || !nameJa}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Save size={16} />
                            {loading ? '儲存中...' : '儲存變更'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
