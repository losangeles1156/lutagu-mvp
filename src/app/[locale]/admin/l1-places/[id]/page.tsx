'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { placesApi, partnersApi } from '@/lib/api/l1-admin';
import type { L1CustomPlace, L1Partner, UpdatePlaceRequest } from '@/lib/types/l1-admin';

const CATEGORIES = [
    { value: 'shopping', label: 'Shopping' },
    { value: 'dining', label: 'Dining' },
    { value: 'leisure', label: 'Leisure' },
    { value: 'culture', label: 'Culture' },
    { value: 'nature', label: 'Nature' },
    { value: 'other', label: 'Other' },
];

export default function EditL1PlacePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const placeId = resolvedParams.id;

    const [place, setPlace] = useState<L1CustomPlace | null>(null);
    const [partners, setPartners] = useState<L1Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<UpdatePlaceRequest>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [placeRes, partnersRes] = await Promise.all([
                    placesApi.get(placeId),
                    partnersApi.list({ status: 'active' }),
                ]);
                setPlace(placeRes.place);
                setPartners(partnersRes.partners);

                // Initialize form data from place
                const p = placeRes.place;
                setFormData({
                    station_id: p.station_id,
                    name_i18n: p.name_i18n,
                    description_i18n: p.description_i18n,
                    category: p.category,
                    subcategory: p.subcategory,
                    address: p.address,
                    location: p.location || undefined,
                    is_partner: p.is_partner,
                    partner_id: p.partner_id,
                    affiliate_url: p.affiliate_url,
                    discount_info: p.discount_info,
                    business_hours: p.business_hours,
                    image_urls: p.image_urls,
                    logo_url: p.logo_url,
                    priority: p.priority,
                    expires_at: p.expires_at,
                    status: p.status,
                    is_active: p.is_active,
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [placeId]);

    const handleSubmit = async (e: React.FormEvent, submitStatus?: string) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const data: UpdatePlaceRequest = { ...formData };
            if (submitStatus) {
                (data as any).status = submitStatus;
            }

            // Remove empty locale strings
            const nameI18n = data.name_i18n || {};
            const descI18n = data.description_i18n || {};
            Object.keys(nameI18n).forEach((key) => {
                if (!nameI18n[key as keyof typeof nameI18n]) {
                    delete nameI18n[key as keyof typeof nameI18n];
                }
            });
            Object.keys(descI18n).forEach((key) => {
                if (!descI18n[key as keyof typeof descI18n]) {
                    delete descI18n[key as keyof typeof descI18n];
                }
            });
            data.name_i18n = nameI18n;
            data.description_i18n = descI18n;

            await placesApi.update(placeId, data);
            router.push('/admin/l1-places');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateName = (lang: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            name_i18n: { ...(prev.name_i18n || {}), [lang]: value },
        }));
    };

    const updateDescription = (lang: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            description_i18n: { ...(prev.description_i18n || {}), [lang]: value },
        }));
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="admin-card p-6 text-center text-slate-500">
                    載入中...
                </div>
            </div>
        );
    }

    if (error && !place) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/l1-places" className="text-slate-600 hover:text-slate-900">
                    ← 返回
                </Link>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-admin-display)' }}>
                    編輯 L1 場所
                </h1>
                    {place && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            place.status === 'approved' ? 'bg-green-100 text-green-800' :
                            place.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            place.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {place.status}
                        </span>
                    )}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
                    {/* Basic Info */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>基本資訊</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Station ID *
                                </label>
                                <input
                                    type="text"
                                    value={formData.station_id || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, station_id: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="e.g., odpt.Station:JR-East.Yamanote.Ueno"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Category *
                                </label>
                                <select
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    required
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Subcategory
                                </label>
                                <input
                                    type="text"
                                    value={formData.subcategory || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, subcategory: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="e.g., convenience_store"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Multilingual Names */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>名稱（多語系）</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Japanese (日本語)
                                </label>
                                <input
                                    type="text"
                                    value={(formData.name_i18n as any)?.ja || ''}
                                    onChange={(e) => updateName('ja', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="Japanese name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    English
                                </label>
                                <input
                                    type="text"
                                    value={(formData.name_i18n as any)?.en || ''}
                                    onChange={(e) => updateName('en', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="English name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Traditional Chinese (繁體中文)
                                </label>
                                <input
                                    type="text"
                                    value={(formData.name_i18n as any)?.['zh-TW'] || ''}
                                    onChange={(e) => updateName('zh-TW', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="Traditional Chinese name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Multilingual Descriptions */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>描述（多語系）</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Japanese (日本語)
                                </label>
                                <textarea
                                    value={(formData.description_i18n as any)?.ja || ''}
                                    onChange={(e) => updateDescription('ja', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    rows={3}
                                    placeholder="Japanese description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    English
                                </label>
                                <textarea
                                    value={(formData.description_i18n as any)?.en || ''}
                                    onChange={(e) => updateDescription('en', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    rows={3}
                                    placeholder="English description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Traditional Chinese (繁體中文)
                                </label>
                                <textarea
                                    value={(formData.description_i18n as any)?.['zh-TW'] || ''}
                                    onChange={(e) => updateDescription('zh-TW', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    rows={3}
                                    placeholder="Traditional Chinese description"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>位置</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="Full address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Latitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.location?.lat || ''}
                                    onChange={(e) => setFormData((prev) => ({
                                        ...prev,
                                        location: e.target.value ? { lat: parseFloat(e.target.value), lng: prev.location?.lng || 0 } : undefined
                                    }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="35.6762"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Longitude
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.location?.lng || ''}
                                    onChange={(e) => setFormData((prev) => ({
                                        ...prev,
                                        location: e.target.value ? { lat: prev.location?.lat || 0, lng: parseFloat(e.target.value) } : undefined
                                    }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                    placeholder="139.6503"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Partner Settings */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>合作設定</h2>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_partner || false}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, is_partner: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium text-slate-700">此為合作夥伴店家</span>
                                </label>
                            </div>

                            {formData.is_partner && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Partner
                                        </label>
                                        <select
                                            value={formData.partner_id || ''}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, partner_id: e.target.value || undefined }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                        >
                                            <option value="">Select a partner...</option>
                                            {partners.map((partner) => (
                                                <option key={partner.id} value={partner.id}>
                                                    {partner.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Affiliate URL
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.affiliate_url || ''}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, affiliate_url: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="admin-card p-6">
                        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-admin-display)' }}>設定</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Priority (1-100)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.priority || 100}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 100 }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Expires At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.expires_at ? formData.expires_at.slice(0, 16) : ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value || undefined }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status || 'draft'}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Active
                                </label>
                                <select
                                    value={formData.is_active === undefined ? 'true' : String(formData.is_active)}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link
                            href="/admin/l1-places"
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50"
                        >
                            取消
                        </Link>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e as any, 'pending')}
                            disabled={saving}
                            className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Submit for Review'}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
        </div>
    );
}
