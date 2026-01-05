'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { partnersApi } from '@/lib/api/l1-admin';
import type { L1Partner, UpdatePartnerRequest } from '@/lib/types/l1-admin';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
];

export default function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const partnerId = resolvedParams.id;

    const [partner, setPartner] = useState<L1Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<UpdatePartnerRequest>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await partnersApi.get(partnerId);
                setPartner(result.partner);
                setFormData({
                    name: result.partner.name,
                    name_ja: result.partner.name_ja,
                    name_en: result.partner.name_en,
                    contact_email: result.partner.contact_email,
                    contact_phone: result.partner.contact_phone,
                    website_url: result.partner.website_url,
                    commission_rate: result.partner.commission_rate,
                    affiliate_code: result.partner.affiliate_code,
                    status: result.partner.status,
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [partnerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Remove empty values
            const data: UpdatePartnerRequest = { ...formData };
            Object.keys(data).forEach((key) => {
                const typedKey = key as keyof UpdatePartnerRequest;
                if (data[typedKey] === '' || data[typedKey] === undefined) {
                    delete data[typedKey];
                }
            });

            await partnersApi.update(partnerId, data);
            router.push('/admin/partners');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof UpdatePartnerRequest, value: string | number | undefined) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4 text-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (error && !partner) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/admin/partners" className="text-blue-600 hover:text-blue-800">
                        ← Back
                    </Link>
                    <h1 className="text-2xl font-bold">Edit Partner</h1>
                    {partner && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            partner.status === 'active' ? 'bg-green-100 text-green-800' :
                            partner.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {partner.status}
                        </span>
                    )}
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Partner Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Company/Store name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Japanese Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name_ja || ''}
                                    onChange={(e) => updateField('name_ja', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Japanese name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    English Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name_en || ''}
                                    onChange={(e) => updateField('name_en', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="English name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.contact_email || ''}
                                    onChange={(e) => updateField('contact_email', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="contact@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone || ''}
                                    onChange={(e) => updateField('contact_phone', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="+81-XX-XXXX-XXXX"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Website URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.website_url || ''}
                                    onChange={(e) => updateField('website_url', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Affiliate Settings */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Affiliate Settings</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commission Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.commission_rate || ''}
                                    onChange={(e) => updateField('commission_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="e.g., 5.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Affiliate Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.affiliate_code || ''}
                                    onChange={(e) => updateField('affiliate_code', e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="e.g., BAMBI2024"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Status</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partner Status
                            </label>
                            <select
                                value={formData.status || 'active'}
                                onChange={(e) => updateField('status', e.target.value as any)}
                                className="w-full border rounded px-3 py-2"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Link
                            href="/admin/partners"
                            className="px-4 py-2 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
